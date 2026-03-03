import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

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

    // Build Google Books search query
    let query = `intitle:${title}`;
    if (author) {
      query += `+inauthor:${author}`;
    }

    const url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=1&langRestrict=en`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error('Google Books API error:', res.status, await res.text());
      return new Response(
        JSON.stringify({ error: `Google Books API error: ${res.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      return new Response(
        JSON.stringify({ success: true, cover_url: null, genres: null, description: null, google_books_id: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const volume = data.items[0];
    const info = volume.volumeInfo || {};

    // Extract cover — prefer large thumbnail, strip edge=curl parameter
    let cover_url: string | null = null;
    if (info.imageLinks) {
      cover_url = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || null;
      if (cover_url) {
        // Upgrade to higher resolution and remove curl effect
        cover_url = cover_url
          .replace('zoom=1', 'zoom=2')
          .replace('&edge=curl', '');
      }
    }

    const genres: string[] | null = info.categories || null;
    const description: string | null = info.description || null;
    const google_books_id: string | null = volume.id || null;

    return new Response(
      JSON.stringify({ success: true, cover_url, genres, description, google_books_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('book-enrich error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
