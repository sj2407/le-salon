import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { apiCall } from '../_shared/apiProxy.ts';
import { getSecret } from '../_shared/vaultClient.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// Supabase Edge Functions global for background tasks: keeps the instance alive
// until the promise settles, after the HTTP response has been returned.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

// ── Platform detection ──────────────────────────────────────────────

function detectPlatform(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) return 'instagram';
    if (hostname.includes('tiktok.com') || hostname.includes('vm.tiktok.com')) return 'tiktok';
    if (hostname.includes('twitter.com') || hostname.includes('x.com') || hostname.includes('t.co')) return 'x';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
    return 'generic';
  } catch {
    return 'generic';
  }
}

// ── SSRF protection ─────────────────────────────────────────────────

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname.toLowerCase();
    // Loopback
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') return false;
    // IPv4 private ranges
    if (hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('169.254.')) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
    // IPv6 private ranges (ULA fc00::/7, link-local fe80::/10)
    if (/^\[?(fc|fd|fe80)/i.test(hostname)) return false;
    // Cloud metadata endpoint
    if (hostname === '169.254.169.254') return false;
    // Internal TLDs
    if (hostname.endsWith('.internal') || hostname.endsWith('.local')) return false;
    return true;
  } catch { return false; }
}

// ── Image re-hosting (persist expiring CDN images) ─────────────────

async function rehostImage(
  imageUrl: string,
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<string | null> {
  try {
    if (!validateUrl(imageUrl)) return null;

    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeSalon/1.0)' },
    });
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 2 * 1024 * 1024) return null;

    const ext = contentType.includes('png') ? 'png'
      : contentType.includes('webp') ? 'webp'
      : contentType.includes('gif') ? 'gif' : 'jpg';
    const filename = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from('share-images')
      .upload(filename, buffer, { contentType, upsert: false });

    if (error) {
      console.error('Image rehost upload failed:', error);
      return null;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('share-images')
      .getPublicUrl(filename);

    return publicUrl;
  } catch (err) {
    console.error('Image rehost failed:', err);
    return null;
  }
}

// ── URL unfurling ───────────────────────────────────────────────────

interface UnfurledMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  site_name: string | null;
  url: string;
}

async function unfurlUrl(url: string): Promise<UnfurledMetadata> {
  const result: UnfurledMetadata = {
    title: null, description: null, image: null, site_name: null, url
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeSalonBot/1.0; +https://lesalon.app)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return result;

    const reader = res.body?.getReader();
    if (!reader) return result;

    let html = '';
    const decoder = new TextDecoder();
    let bytesRead = 0;
    const MAX_BYTES = 50_000;

    while (bytesRead < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytesRead += value.length;
    }
    reader.cancel();

    // Parse og: tags (property-first and content-first attribute orders)
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
    const ogSite = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']*)["']/i);

    const ogTitle2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
    const ogDesc2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i);
    const ogImage2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i);
    const ogSite2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:site_name["']/i);

    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    result.title = ogTitle?.[1] || ogTitle2?.[1] || titleTag?.[1] || null;
    result.description = ogDesc?.[1] || ogDesc2?.[1] || null;
    result.image = ogImage?.[1] || ogImage2?.[1] || null;
    result.site_name = ogSite?.[1] || ogSite2?.[1] || null;

    // Decode HTML entities
    for (const key of ['title', 'description', 'site_name', 'image'] as const) {
      if (result[key]) {
        result[key] = result[key]!
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
      }
    }
  } catch {
    // Unfurling failed — proceed with just the URL
  }

  return result;
}

// ── Sanitize metadata before LLM prompt ─────────────────────────────

function sanitizeForLlm(text: string | null | undefined, maxLength: number): string | null {
  if (!text) return null;
  return text
    .slice(0, maxLength)
    .replace(/[\x00-\x1F]/g, '')
    .replace(/`/g, "'")
    .trim() || null;
}

// ── Claude Haiku classification ─────────────────────────────────────

const CLASSIFICATION_PROMPT = `You are a URL classifier for a cultural discovery app called Le Salon. Users share URLs from their phone's Share Sheet — these could be Instagram posts about exhibitions, TikTok videos about books, articles about movies, event listings, etc.

Given the URL, platform, and any metadata we could extract (og:title, og:description, og:image), classify the shared content and extract structured fields.

## Classification categories:
- "activity" — a specific event with a date/location: exhibition, concert, theatre show, festival, pop-up, class, workshop, or similar time-bound experience
- "book" — a book recommendation or discussion
- "movie" — a film recommendation or discussion
- "show" — a TV series recommendation or discussion
- "podcast" — a podcast recommendation or discussion
- "album" — a music album or artist recommendation
- "performing_arts" — theatre, dance, opera, or live performance (when not a specific dated event)
- "exhibition" — an art exhibition or museum show (when not a specific dated event)
- "article" — a notable article, essay, or longform piece worth reading
- "other" — doesn't fit the above categories

## Routing rules:
- If classification is "activity": route to "activity" (the Activity Board / To-Do page)
- All other classifications: route to "la_liste" (the discovery wishlist)

## Extracted fields (include ALL that you can determine):
- "title": the name of the item (clean, proper capitalization)
- "creator": artist, author, director, or creator name (if identifiable)
- "date_text": human-readable date string (e.g., "Until Mar 30, 2026", "Feb 14") — only for activities
- "city": city name — only for activities
- "location": specific venue — only for activities
- "price": price info — only for activities
- "tag": the La Liste tag to use (one of: movie, book, article, podcast, show, album, performing_arts, exhibition, other) — only for la_liste items
- "note": a brief contextual note about why this is interesting (1 sentence max) — only if obvious from the metadata

Return ONLY valid JSON in this exact format:
{
  "classification": "<category>",
  "routed_to": "<activity|la_liste>",
  "confidence": <0.0 to 1.0>,
  "fields": {
    "title": "...",
    "creator": "...",
    ...
  }
}

Do not include any text outside the JSON. If you cannot determine the content, use classification "other" with routed_to "la_liste".`;

const VALID_CLASSIFICATIONS = [
  'activity', 'book', 'movie', 'show', 'podcast', 'album',
  'performing_arts', 'exhibition', 'article', 'other'
];

interface ClassificationResult {
  classification: string;
  routed_to: string;
  confidence: number;
  fields: Record<string, unknown>;
}

async function classifyWithHaiku(
  url: string,
  platform: string,
  metadata: UnfurledMetadata,
  apiKey: string
): Promise<ClassificationResult> {
  const userMessage = `URL: ${url}
Platform: ${platform}
Title: ${metadata.title || 'N/A'}
Description: ${metadata.description || 'N/A'}
Site: ${metadata.site_name || 'N/A'}
Image: ${metadata.image ? 'Yes' : 'No'}`;

  // Fixture key: use 'other' as default mock response for all platforms.
  // In mock mode, all classifications return the 'other' fixture.
  // Platform-specific fixtures can be added as needed for targeted testing.
  const fixtureKey = `haiku-classify-other`;

  const data = await apiCall<{ content?: { text?: string }[] }>({
    service: 'anthropic',
    endpoint: '/v1/messages',
    fixtureKey,
    fetchFn: () => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: CLASSIFICATION_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
      // Safety valve: bound the background isolate's lifetime. A healthy Haiku
      // call returns in ~1-3s; 12s never trips a good call, and on timeout the
      // AbortError takes the existing catch path → needs_review (no data change).
      signal: AbortSignal.timeout(12000),
    }),
  });

  const text = data.content?.[0]?.text || '';

  // Parse JSON — handle markdown fences
  let parsed: ClassificationResult;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error('No JSON found in classification response');
    }
  }

  // Validate classification
  if (!VALID_CLASSIFICATIONS.includes(parsed.classification)) {
    parsed.classification = 'other';
  }
  if (!['activity', 'la_liste'].includes(parsed.routed_to)) {
    parsed.routed_to = parsed.classification === 'activity' ? 'activity' : 'la_liste';
  }

  return parsed;
}

// ── Auth: resolve user from JWT or share token ──────────────────────

async function resolveUser(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ userId: string } | { error: string; status: number }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { error: 'Missing authorization header', status: 401 };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { error: 'Unsupported authorization scheme', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');

  // Check if this looks like a share token (64-char hex string)
  if (/^[a-f0-9]{64}$/.test(token)) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const { data, error } = await supabaseAdmin
      .from('share_tokens')
      .select('user_id')
      .eq('token_hash', hashHex)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) {
      return { error: 'Invalid share token', status: 401 };
    }

    // Update last_used_at (fire-and-forget)
    supabaseAdmin
      .from('share_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token_hash', hashHex)
      .then(() => {});

    return { userId: data.user_id };
  }

  // Standard JWT flow
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user) {
    return { error: 'Invalid JWT', status: 401 };
  }

  return { userId: user.id };
}

// ── Background enrichment ───────────────────────────────────────────
// Runs AFTER the HTTP response via EdgeRuntime.waitUntil. Performs the exact
// same work the handler used to do inline (unfurl → sanitize → classify ‖
// rehost), then UPDATEs the skeleton row. The terminal row is byte-for-byte
// identical to the old single-INSERT flow; only the timing and INSERT→UPDATE
// differ. Must never throw out of here unhandled.

async function enrichShare(
  supabaseAdmin: ReturnType<typeof createClient>,
  shareId: string,
  url: string,
  platform: string,
): Promise<void> {
  // Best-effort only: log if the isolate is torn down mid-enrichment. The
  // reconcile_stuck_shares cron is the actual recovery guarantee, NOT this.
  const onUnload = () => {
    console.warn(`share-intake: shutdown during enrichment of share ${shareId}`);
  };
  addEventListener('beforeunload', onUnload);

  // Hoisted so the failure path can persist whatever metadata was gathered
  // before a crash (e.g. unfurl succeeded but the API key was missing), so a
  // 'failed' row still carries a title/image rather than being bare.
  let metadata: UnfurledMetadata = {
    title: null, description: null, image: null, site_name: null, url,
  };

  try {
    // Unfurl URL (verbatim from the old inline flow)
    metadata = await unfurlUrl(url);
    metadata.title = sanitizeForLlm(metadata.title, 200);
    metadata.description = sanitizeForLlm(metadata.description, 500);
    metadata.site_name = sanitizeForLlm(metadata.site_name, 100);

    const anthropicKey = await getSecret(supabaseAdmin, 'anthropic_api_key');
    if (!anthropicKey) throw new Error('Classification API key not configured');

    // Classification + image re-hosting in parallel (verbatim)
    let classifyError: string | null = null;
    const [classResult, rehostedUrl] = await Promise.all([
      classifyWithHaiku(url, platform, metadata, anthropicKey)
        .catch((err: Error) => {
          console.error('Haiku classification failed, storing for manual review:', err);
          classifyError = err.message;
          return null;
        }),
      metadata.image ? rehostImage(metadata.image, supabaseAdmin) : Promise.resolve(null),
    ]);

    if (rehostedUrl) metadata.image = rehostedUrl;

    // Same two payload shapes as the old insert, now applied as an UPDATE.
    // Both are a completed enrichment → enrichment_status 'done' (a classify
    // failure is needs_review, not a failed enrichment).
    const updatePayload = classifyError || !classResult
      ? {
          raw_metadata: metadata,
          ai_classification: null,
          ai_extracted_fields: { error: classifyError },
          routed_to: null,
          needs_review: true,
          enrichment_status: 'done',
        }
      : {
          raw_metadata: metadata,
          ai_classification: classResult.classification,
          ai_extracted_fields: {
            ...classResult.fields,
            confidence: classResult.confidence,
          },
          routed_to: classResult.routed_to,
          needs_review: false,
          enrichment_status: 'done',
        };

    const { error: updateError } = await supabaseAdmin
      .from('pending_shares')
      .update(updatePayload)
      .eq('id', shareId);

    if (updateError) throw new Error(`Enrichment update failed: ${updateError.message}`);
  } catch (err) {
    // Enrichment crashed entirely (key missing, update failed, etc.). The
    // skeleton row already exists, so the share is never lost — flag it for
    // manual review, persisting any metadata gathered so far. Scope to
    // 'enriching' so we can never clobber a row already marked 'done'. Guard the
    // update itself so a failure here can't escape as an unhandled rejection
    // inside waitUntil (the reconcile_stuck_shares cron is the final backstop).
    console.error('share-intake enrichment failed:', err);
    try {
      await supabaseAdmin
        .from('pending_shares')
        .update({ raw_metadata: metadata, needs_review: true, enrichment_status: 'failed' })
        .eq('id', shareId)
        .eq('enrichment_status', 'enriching');
    } catch (updateErr) {
      console.error('share-intake failed to mark share for review:', updateErr);
    }
  } finally {
    removeEventListener('beforeunload', onUnload);
  }
}

// ── Main handler ────────────────────────────────────────────────────
// Synchronous phase: authorize, enforce rate-limit + dedup, insert a skeleton
// row, and ACK immediately. Enrichment runs in the background (above).

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Resolve user identity (auth gate — must precede everything)
    const authResult = await resolveUser(req, supabaseAdmin);
    if ('error' in authResult) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = authResult.userId;

    // Parse request body
    let body: { url?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = body;
    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SSRF protection
    if (!validateUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL: only public HTTP(S) URLs are accepted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pre-checks: rate-limit count + duplicate lookup run in parallel (both are
    // independent reads scoped to userId). Insert stays strictly after them.
    const [rateResult, dupResult] = await Promise.all([
      supabaseAdmin
        .from('pending_shares')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()),
      supabaseAdmin
        .from('pending_shares')
        .select('id')
        .eq('user_id', userId)
        .eq('source_url', url)
        .eq('status', 'pending')
        .maybeSingle(),
    ]);

    if ((rateResult.count ?? 0) >= 20) {
      return new Response(
        JSON.stringify({ error: 'Rate limit: max 20 shares per hour' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (dupResult.data) {
      return new Response(
        JSON.stringify({ message: 'Already pending', existing_id: dupResult.data.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const platform = detectPlatform(url);

    // Skeleton insert: only the synchronously-known columns. Enrichment fields
    // keep their schema defaults (raw_metadata {}, ai_* null, needs_review false).
    // enrichment_status='enriching' marks the row as in-progress so the UI and
    // the realtime listener hold off until the background UPDATE lands.
    const { data: share, error: insertError } = await supabaseAdmin
      .from('pending_shares')
      .insert({
        user_id: userId,
        source_url: url,
        source_platform: platform,
        status: 'pending',
        enrichment_status: 'enriching',
      })
      .select('id')
      .single();

    if (insertError) {
      // Race-safe dedup: a concurrent share of the same URL hit the partial
      // unique index. Return the same "already pending" shape as the soft check.
      if ((insertError as { code?: string }).code === '23505') {
        const { data: existing } = await supabaseAdmin
          .from('pending_shares')
          .select('id')
          .eq('user_id', userId)
          .eq('source_url', url)
          .eq('status', 'pending')
          .maybeSingle();
        return new Response(
          JSON.stringify({ message: 'Already pending', existing_id: existing?.id ?? null }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Insert failed: ${insertError.message}`);
    }

    // Enrich in the background — the function instance stays alive until this
    // promise settles, independent of the iOS extension's lifecycle.
    EdgeRuntime.waitUntil(enrichShare(supabaseAdmin, share.id, url, platform));

    // Fast ack: the share sheet dismisses on this. No title yet (enrichment is
    // still running); the client fills it in via the realtime UPDATE.
    return new Response(
      JSON.stringify({
        success: true,
        share_id: share.id,
        status: 'enriching',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('share-intake error:', err);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
