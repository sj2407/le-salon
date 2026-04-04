import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

// Cache Anthropic key across warm invocations
let cachedAnthropicKey: string | null = null;

const SCAN_PROMPT =
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
    // Try to find a JSON array in the response
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
  const corsHeaders = getCorsHeaders(req);
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

    // Fetch Anthropic API key from vault
    if (!cachedAnthropicKey) {
      const { data: secrets } = await supabaseAdmin.rpc('get_secret', {
        secret_name: 'anthropic_api_key',
      });
      cachedAnthropicKey = secrets?.[0]?.secret || null;
    }

    if (!cachedAnthropicKey) {
      return new Response(
        JSON.stringify({ error: 'Vision API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Claude Vision API
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cachedAnthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image_base64,
              },
            },
            {
              type: 'text',
              text: SCAN_PROMPT,
            },
          ],
        }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error(`Vision API error: ${anthropicRes.status} ${errText}`);
    }

    const anthropicData = await anthropicRes.json();
    const textContent =
      anthropicData.content?.[0]?.text || '';

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
    console.error('bookshelf-scan error:', err);
    const status = message.includes('Vision API error') ? 502 : 500;
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
