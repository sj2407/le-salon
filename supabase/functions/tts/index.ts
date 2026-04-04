import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

function chunkText(text: string, maxLen = 4000): string[] {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let splitAt = remaining.lastIndexOf(". ", maxLen);
    if (splitAt < maxLen * 0.5) splitAt = remaining.lastIndexOf("? ", maxLen);
    if (splitAt < maxLen * 0.5) splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt < maxLen * 0.5) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt + 1).trim());
    remaining = remaining.slice(splitAt + 1).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function generateChunkAudio(text: string, openaiKey: string): Promise<ArrayBuffer> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: "nova",
      response_format: "mp3",
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI TTS error: ${errText}`);
  }
  return res.arrayBuffer();
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    // Decode JWT payload to check role (service_role bypasses user auth)
    let isServiceRole = false;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      isServiceRole = payload.role === "service_role";
    } catch { /* not a valid JWT, will fail user auth below */ }

    // Allow service-role key (used by load-week.js) to bypass user auth
    if (!isServiceRole) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate Limiting (10 requests/hour) — only for regular users
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', {
        p_user_id: user.id,
        p_function_name: 'tts',
        p_max_requests: 10,
        p_window_minutes: 60,
      });
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
        });
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { salon_week_id } = await req.json();
    if (!salon_week_id) {
      return new Response(JSON.stringify({ error: "salon_week_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioPath = `week-${salon_week_id}.mp3`;
    const publicUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/salon-audio/${audioPath}`;

    // Check if audio already exists
    const { data: files } = await supabaseAdmin.storage
      .from("salon-audio")
      .list("", { search: `week-${salon_week_id}.mp3` });

    if (files && files.length > 0) {
      return new Response(JSON.stringify({ url: publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch essay text
    const { data: week, error: weekError } = await supabaseAdmin
      .from("salon_weeks")
      .select("parlor_title, parlor_body")
      .eq("id", salon_week_id)
      .single();

    if (weekError || !week) {
      return new Response(JSON.stringify({ error: "Week not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OpenAI key from Vault
    const { data: secrets } = await supabaseAdmin.rpc("get_secret", {
      secret_name: "openai_api_key",
    });
    const openaiKey = secrets?.[0]?.secret;
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OpenAI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare text and chunk it
    const text = `${week.parlor_title}. ${week.parlor_body}`
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1");

    const chunks = chunkText(text);
    console.log(`Generating audio for ${chunks.length} chunk(s), total ${text.length} chars`);

    // Generate audio for each chunk sequentially
    const audioBuffers: ArrayBuffer[] = [];
    for (const chunk of chunks) {
      const buf = await generateChunkAudio(chunk, openaiKey);
      audioBuffers.push(buf);
    }

    // Concatenate MP3 buffers
    const totalLength = audioBuffers.reduce((acc, buf) => acc + buf.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of audioBuffers) {
      combined.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }

    // Upload to Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("salon-audio")
      .upload(audioPath, combined.buffer, {
        contentType: "audio/mpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
    }

    return new Response(
      JSON.stringify({ url: publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("TTS function error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
