import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json';

// ── Helpers ──

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9àâäéèêëïîôùûüÿçœæ\s]/g, '').trim();
}

/**
 * Score a Google Books result against the search query.
 * Higher = better match. Returns -1 if result has no cover.
 */
function scoreVolume(
  item: Record<string, unknown>,
  searchTitle: string,
  searchAuthor: string | null
): number {
  const info = (item.volumeInfo || {}) as Record<string, unknown>;

  // Must have a cover image — skip otherwise
  if (!info.imageLinks) return -1;

  let score = 0;
  const resultTitle = normalize((info.title as string) || '');
  const targetTitle = normalize(searchTitle);

  // Title match (exact > contains > partial)
  if (resultTitle === targetTitle) score += 5;
  else if (resultTitle.startsWith(targetTitle) || targetTitle.startsWith(resultTitle)) score += 3;
  else if (resultTitle.includes(targetTitle) || targetTitle.includes(resultTitle)) score += 2;

  // Author match
  if (searchAuthor) {
    const authors = ((info.authors as string[]) || []).map(a => normalize(a));
    const targetAuthor = normalize(searchAuthor);
    if (authors.some(a => a === targetAuthor)) score += 4;
    else if (authors.some(a => a.includes(targetAuthor) || targetAuthor.includes(a))) score += 2;
  }

  // Prefer entries with richer metadata (real books, not catalog stubs)
  if (info.description) score += 1;
  if ((info.pageCount as number) > 50) score += 1;

  return score;
}

// ── Google Books ──

async function searchGoogleBooks(
  title: string,
  author: string | null
): Promise<Record<string, unknown> | null> {
  // Try title+author first, then title-only fallback
  const queries: string[] = [];
  if (author) {
    queries.push(`intitle:${title}+inauthor:${author}`);
  }
  queries.push(`intitle:${title}`);

  for (const query of queries) {
    const url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=8`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = await res.json();
    if (!data.items || data.items.length === 0) continue;

    // Score all results and pick the best one with a cover
    let bestVolume: Record<string, unknown> | null = null;
    let bestScore = -1;

    for (const item of data.items) {
      const s = scoreVolume(item, title, author);
      if (s > bestScore) {
        bestScore = s;
        bestVolume = item;
      }
    }

    if (bestVolume && bestScore >= 0) return bestVolume;
  }

  return null;
}

// ── Open Library fallback ──

async function searchOpenLibraryCover(
  title: string,
  author: string | null
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      title,
      limit: '5',
      fields: 'cover_i,title,author_name',
    });
    if (author) params.set('author', author);

    const res = await fetch(`${OPEN_LIBRARY_SEARCH}?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.docs || data.docs.length === 0) return null;

    const withCover = data.docs.find(
      (doc: Record<string, unknown>) => doc.cover_i
    );
    if (!withCover) return null;

    return `https://covers.openlibrary.org/b/id/${withCover.cover_i}-M.jpg`;
  } catch {
    return null;
  }
}

// ── Extract data from chosen volume ──

function extractBookData(volume: Record<string, unknown>) {
  const info = (volume.volumeInfo || {}) as Record<string, unknown>;

  let cover_url: string | null = null;
  const imageLinks = info.imageLinks as Record<string, string> | undefined;
  if (imageLinks) {
    cover_url = imageLinks.thumbnail || imageLinks.smallThumbnail || null;
    if (cover_url) {
      cover_url = cover_url
        .replace('http://', 'https://')
        .replace('&edge=curl', '');
    }
  }

  return {
    cover_url,
    genres: (info.categories as string[]) || null,
    description: (info.description as string) || null,
    google_books_id: (volume.id as string) || null,
  };
}

// ── Handler ──

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { title, author } = await req.json();
    if (!title) {
      return new Response(
        JSON.stringify({ error: 'title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const volume = await searchGoogleBooks(title, author || null);

    if (!volume) {
      // Google Books found nothing — try Open Library for a cover
      const olCover = await searchOpenLibraryCover(title, author || null);
      return new Response(
        JSON.stringify({ success: true, cover_url: olCover, genres: null, description: null, google_books_id: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = extractBookData(volume);

    // Fallback to Open Library if Google Books returned no cover
    if (!result.cover_url) {
      const olCover = await searchOpenLibraryCover(title, author || null);
      if (olCover) result.cover_url = olCover;
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('book-enrich error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
