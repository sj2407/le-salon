import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache Gemini key across warm invocations
let cachedGeminiKey: string | null = null;

const GEMINI_PROMPT =
  'Look at this bookshelf photograph. List every book title you can read on the spines. ' +
  'For each book, provide the title and author if visible. Return ONLY a JSON array of objects ' +
  'with "title" and "author" fields. If the author is not visible, set author to null. ' +
  'No preamble, no explanation, just the JSON array.';

interface DetectedBook {
  title: string;
  author: string | null;
}

function extractJsonArray(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try to find a JSON array in the response (Gemini sometimes wraps in markdown)
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('No JSON array found in response');
  }
}

function validateAndFilterBooks(parsed: unknown): DetectedBook[] {
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item: unknown) => {
      if (typeof item !== 'object' || item === null) return false;
      const obj = item as Record<string, unknown>;
      return typeof obj.title === 'string' && obj.title.trim().length > 0;
    })
    .map((item: unknown) => {
      const obj = item as Record<string, unknown>;
      return {
        title: (obj.title as string).trim(),
        author: typeof obj.author === 'string' && obj.author.trim().length > 0
          ? obj.author.trim()
          : null,
      };
    });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');

    // Get the user ID from the JWT for rate limiting
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { image_base64 } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: 'image_base64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin client for vault access and rate limiting
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Rate limit: 3 attempts per 24 hours (1440 minutes)
    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_function_name: 'bookshelf-scan',
      p_max_requests: 3,
      p_window_minutes: 1440,
    });

    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded — max 3 bookshelf scans per 24 hours' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch Gemini API key from vault
    if (!cachedGeminiKey) {
      const { data: secrets } = await supabaseAdmin.rpc('get_secret', {
        secret_name: 'gemini_api_key',
      });
      cachedGeminiKey = secrets?.[0]?.secret || null;
    }

    if (!cachedGeminiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Gemini Flash Vision API
    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${cachedGeminiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: GEMINI_PROMPT },
            { inline_data: { mime_type: 'image/jpeg', data: image_base64 } },
          ],
        }],
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API error: ${geminiRes.status} ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const textContent =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!textContent) {
      return new Response(
        JSON.stringify({
          success: true,
          books: [],
          message: 'No books detected — try a better-lit photo.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let books: DetectedBook[] = [];
    try {
      const parsed = extractJsonArray(textContent);
      books = validateAndFilterBooks(parsed);
    } catch {
      // If parsing fails entirely, return empty with guidance
      return new Response(
        JSON.stringify({
          success: true,
          books: [],
          message: 'No books detected — try a better-lit photo.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (books.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          books: [],
          message: 'No books detected — try a better-lit photo.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, books }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = (err as Error).message || 'Unknown error';
    const status = message.includes('Gemini API error') ? 502 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
