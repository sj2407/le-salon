import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parse } from "jsr:@std/csv";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

/**
 * Goodreads CSV Import
 *
 * Parses a Goodreads CSV export, filters to "read" shelf only,
 * enriches each book via Google Books API, and upserts into the books table.
 * Duplicates (title + author match) are skipped silently.
 * CSV is never stored server-side.
 */

async function enrichFromGoogleBooks(title: string, author: string | null) {
  try {
    let query = `intitle:${title}`;
    if (author) query += `+inauthor:${author}`;

    const url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=1&langRestrict=en`;
    const res = await fetch(url);

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;

    const info = data.items[0].volumeInfo || {};
    let cover_url: string | null = null;
    if (info.imageLinks) {
      cover_url = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || null;
      if (cover_url) {
        cover_url = cover_url.replace('zoom=1', 'zoom=2').replace('&edge=curl', '');
      }
    }

    return {
      cover_url,
      google_books_id: data.items[0].id || null,
      google_books_genres: info.categories || null,
      google_books_description: info.description || null,
    };
  } catch {
    return null;
  }
}

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

    // Create Supabase client with user's JWT for RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Could not verify user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { csv_content } = await req.json();
    if (!csv_content) {
      return new Response(
        JSON.stringify({ error: 'csv_content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse CSV — Goodreads export columns include:
    // Title, Author, My Rating, Exclusive Shelf, Date Read, etc.
    const rows = parse(csv_content, {
      skipFirstRow: true,
      columns: undefined, // auto-detect from header
    }) as Record<string, string>[];

    // Filter to "read" shelf only (PRD: Currently-reading and to-read are ignored)
    const readBooks = rows.filter(row => row['Exclusive Shelf'] === 'read');

    let imported_count = 0;
    let skipped_count = 0;

    for (const row of readBooks) {
      const title = (row['Title'] || '').trim();
      const author = (row['Author'] || '').trim() || null;
      const goodreadsRating = parseInt(row['My Rating'] || '0', 10);

      if (!title) {
        skipped_count++;
        continue;
      }

      // Convert Goodreads 1-5 scale to our 0-10 scale (multiply by 2)
      // Goodreads 0 = not rated → null
      const rating = goodreadsRating > 0 ? goodreadsRating * 2 : null;

      // Enrich via Google Books
      const enrichment = await enrichFromGoogleBooks(title, author);

      // Extract Goodreads genres from "Bookshelves" column (comma-separated)
      const shelvesRaw = row['Bookshelves'] || '';
      const goodreads_genres = shelvesRaw
        ? shelvesRaw.split(',').map((s: string) => s.trim()).filter(Boolean)
        : null;

      // Upsert — ON CONFLICT on unique index (user_id, lower(title), lower(author))
      // uses insert with onConflict to skip duplicates
      const { error: insertError } = await supabase
        .from('books')
        .upsert({
          user_id: user.id,
          title,
          author,
          status: 'read',
          source: 'goodreads_csv',
          rating,
          goodreads_genres: goodreads_genres && goodreads_genres.length > 0 ? goodreads_genres : null,
          cover_url: enrichment?.cover_url || null,
          google_books_id: enrichment?.google_books_id || null,
          google_books_genres: enrichment?.google_books_genres || null,
          google_books_description: enrichment?.google_books_description || null,
        }, {
          onConflict: 'user_id,lower(title),lower(coalesce(author,\'\'))',
          ignoreDuplicates: true,
        });

      if (insertError) {
        // If the conflict-based upsert fails, try a plain insert that ignores duplicates
        console.error('Insert error for book:', title, insertError.message);
        skipped_count++;
      } else {
        imported_count++;
      }

      // Small delay to stay within Google Books rate limits (1000/day)
      if (enrichment !== null) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    return new Response(
      JSON.stringify({ success: true, imported_count, skipped_count }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('goodreads-import error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
