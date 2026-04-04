import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `You are a structured data parser for a personal interest-tracking app called "Le Salon". Users dictate what they're currently reading, watching, listening to, etc. and you must parse their speech into structured entries.

IMPORTANT: The user may speak in English, French, or a mix of both. Parse regardless of language. Always return the content in the ORIGINAL language the user used for that item.

## Output Format
Return a JSON object with a single key "entries" containing an array of objects. Each object has:
- "category": one of the exact strings below
- "subcategory": one of the exact strings below for that category, or null for freeform categories
- "content": the title/name/text extracted from the speech

## Categories and Subcategories (EXACT strings — use these verbatim)

1. "Reading"
   - subcategory: "book" — for books, novels, manga, graphic novels, bandes dessinées
   - subcategory: "article" — for articles, essays, blog posts, newsletters, papers

2. "Listening"
   - subcategory: "music" — for songs, albums, artists, bands
   - subcategory: "podcast" — for podcasts, podcast episodes
   - subcategory: "audiobook" — for audiobooks

3. "Watching"
   - subcategory: "tv" — for TV shows, series, anime, documentaries (series)
   - subcategory: "movie" — for movies, films, documentaries (one-off)

4. "Looking Forward To" (subcategory: null)
   - Things the user is excited about, anticipating, or planning
   - Content is freeform text

5. "Performing Arts and Exhibits"
   - subcategory: "musical theatre" — for plays, musicals, theater, opera, dance performances
   - subcategory: "exhibits" — for art exhibitions, museum shows, gallery visits

6. "Obsessing Over" (subcategory: null)
   - Things the user can't stop thinking about, is fascinated by, hobbies, interests
   - Content is freeform text

7. "My latest AI prompt" (subcategory: null)
   - AI-related things the user has asked or experimented with
   - Content is freeform text

## Parsing Rules

1. Extract ONLY the title/name — strip away conversational filler like "I'm reading", "je regarde", "I just started", "en ce moment j'écoute", etc.
2. For books: extract just the book title. If the author is mentioned, include it as "Title by Author".
3. For TV/movies: extract just the show or movie title. If they say "the new season of X", just extract "X".
4. For music: extract "Song by Artist" or just "Artist" or just "Album by Artist" depending on what's mentioned.
5. For podcasts: extract the podcast name, and optionally the episode if specified.
6. If the user mentions something but you can't determine which category, make your best guess based on context.
7. If the input is ambiguous between TV and movie, prefer "tv" for series and "movie" for films.
8. For freeform categories, keep each distinct item as a separate entry.

## French Language Hints
- "je lis" / "je suis en train de lire" = Reading
- "j'écoute" / "je suis en train d'écouter" = Listening
- "je regarde" / "je suis en train de regarder" = Watching
- "j'ai hâte de" / "je suis impatient(e)" / "j'attends avec impatience" = Looking Forward To
- "je suis obsédé(e) par" / "j'arrête pas de penser à" = Obsessing Over
- "j'ai vu" (in theater/live context) = Performing Arts and Exhibits
- "spectacle" / "pièce de théâtre" / "exposition" / "expo" = Performing Arts and Exhibits
- "chanson" / "album" / "morceau" = music
- "série" / "émission" = tv
- "film" / "long-métrage" = movie
- "livre" / "roman" / "bouquin" = book
- "balado" (Quebec French for podcast) = podcast

## Examples

Input: "I watched Breaking Bad on TV, I'm reading The Stranger by Camus"
Output:
{
  "entries": [
    { "category": "Watching", "subcategory": "tv", "content": "Breaking Bad" },
    { "category": "Reading", "subcategory": "book", "content": "The Stranger by Camus" }
  ]
}

Input: "Je lis le dernier roman de Houellebecq, et j'écoute beaucoup de Stromae en ce moment"
Output:
{
  "entries": [
    { "category": "Reading", "subcategory": "book", "content": "Le dernier roman de Houellebecq" },
    { "category": "Listening", "subcategory": "music", "content": "Stromae" }
  ]
}

Input: "I'm obsessing over sourdough bread and I'm looking forward to my trip to Japan"
Output:
{
  "entries": [
    { "category": "Obsessing Over", "subcategory": null, "content": "Sourdough bread" },
    { "category": "Looking Forward To", "subcategory": null, "content": "My trip to Japan" }
  ]
}

Input: "I just saw Hamilton on Broadway and I'm listening to the Serial podcast"
Output:
{
  "entries": [
    { "category": "Performing Arts and Exhibits", "subcategory": "musical theatre", "content": "Hamilton" },
    { "category": "Listening", "subcategory": "podcast", "content": "Serial" }
  ]
}

Input: "En ce moment je regarde la nouvelle saison de The Bear, je lis un article sur l'IA dans Le Monde, et j'ai demandé à ChatGPT de m'expliquer la physique quantique"
Output:
{
  "entries": [
    { "category": "Watching", "subcategory": "tv", "content": "The Bear" },
    { "category": "Reading", "subcategory": "article", "content": "Article sur l'IA dans Le Monde" },
    { "category": "My latest AI prompt", "subcategory": null, "content": "Expliquer la physique quantique" }
  ]
}

If the transcript is empty, nonsensical, or contains no identifiable entries, return: { "entries": [] }`;

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

    const { transcript: rawTranscript } = await req.json();
    if (!rawTranscript || typeof rawTranscript !== "string" || !rawTranscript.trim()) {
      return new Response(
        JSON.stringify({ error: "transcript is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Sanitize: strip control characters, collapse whitespace, enforce length limit
    const transcript = String(rawTranscript)
      .slice(0, 5000)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!transcript) {
      return new Response(
        JSON.stringify({ entries: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user from JWT
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Could not verify user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: 30 per 24 hours
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: allowed } = await supabaseAdmin.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_function_name: "parse-card-dictation",
      p_max_requests: 30,
      p_window_minutes: 1440,
    });

    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded — max 30 dictations per 24 hours" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: secrets } = await supabaseAdmin.rpc("get_secret", {
      secret_name: "openai_api_key",
    });
    const openaiKey = secrets?.[0]?.secret;
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: transcript },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
      }
    );

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to parse dictation" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ entries: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(content);

    const VALID_CATEGORIES: Record<string, string[] | null> = {
      Reading: ["book", "article"],
      Listening: ["music", "podcast", "audiobook"],
      Watching: ["tv", "movie"],
      "Looking Forward To": null,
      "Performing Arts and Exhibits": ["musical theatre", "exhibits"],
      "Obsessing Over": null,
      "My latest AI prompt": null,
    };

    const validatedEntries = (parsed.entries || []).filter(
      (entry: { category: string; subcategory: string | null; content: string }) => {
        if (!entry.category || !entry.content) return false;
        if (!(entry.category in VALID_CATEGORIES)) return false;
        const validSubs = VALID_CATEGORIES[entry.category];
        if (validSubs === null) {
          entry.subcategory = null;
          return true;
        }
        if (!validSubs.includes(entry.subcategory)) return false;
        return true;
      }
    );

    return new Response(JSON.stringify({ entries: validatedEntries }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Parse dictation error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
