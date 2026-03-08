// Cover image search APIs for books, albums, movies, shows, podcasts
// All search functions return: Array<{ id, title, subtitle, imageUrl }>


/**
 * Shared JSONP utility — used by Deezer (albums) and iTunes (podcasts)
 */
export function jsonpFetch(url, callbackParam = 'callback') {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const script = document.createElement('script')
    script.src = `${url}&${callbackParam}=${callbackName}`

    window[callbackName] = (data) => {
      clearTimeout(timeout)
      delete window[callbackName]
      if (script.parentNode) script.parentNode.removeChild(script)
      resolve(data)
    }

    const timeout = setTimeout(() => {
      if (window[callbackName]) {
        window[callbackName] = () => { delete window[callbackName] }
        if (script.parentNode) script.parentNode.removeChild(script)
        reject(new Error('Timeout'))
      }
    }, 8000)

    script.onerror = () => {
      clearTimeout(timeout)
      delete window[callbackName]
      if (script.parentNode) script.parentNode.removeChild(script)
      reject(new Error('Failed'))
    }

    document.body.appendChild(script)
  })
}

/**
 * Search books via Open Library (free, no key, CORS OK)
 * Fetches more results and filters to those with covers.
 */
async function searchOpenLibrary(query) {
  const encoded = encodeURIComponent(query)
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encoded}&limit=15&fields=key,title,author_name,cover_i,first_publish_year,edition_count`
  )
  const data = await res.json()

  return (data.docs || [])
    // Filter out study guides / companion books
    .filter(doc => {
      const t = (doc.title || '').toLowerCase()
      return !t.startsWith('clés pour') && !t.startsWith('notes on') &&
        !t.startsWith('study guide') && !t.startsWith('profil d')
    })
    // Prefer results with covers, sort by edition_count (popular editions have better covers)
    .sort((a, b) => {
      const aCover = a.cover_i ? 1 : 0
      const bCover = b.cover_i ? 1 : 0
      if (aCover !== bCover) return bCover - aCover
      return (b.edition_count || 0) - (a.edition_count || 0)
    })
    .slice(0, 8)
    .map(doc => ({
      id: doc.key,
      title: doc.title,
      subtitle: [
        doc.author_name?.[0],
        doc.first_publish_year
      ].filter(Boolean).join(', '),
      imageUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : ''
    }))
}

/**
 * Clean a Google Books thumbnail URL — ensure HTTPS + strip curl effect.
 * Note: zoom=2 breaks for books without preview, so we keep zoom=1.
 */
function enhanceGoogleBooksUrl(url) {
  if (!url) return ''
  return url
    .replace('http://', 'https://')
    .replace('&edge=curl', '')
}

/**
 * Search books via Google Books (free, no key needed) with enhanced covers.
 * Fetches more results, filters out entries without real covers.
 */
async function searchGoogleBooks(query) {
  try {
    const encoded = encodeURIComponent(query)
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encoded}&maxResults=12`
    )
    if (!res.ok) return []
    const data = await res.json()

    return (data.items || [])
      .map(item => {
        const vi = item.volumeInfo || {}
        return {
          id: `gb_${item.id}`,
          title: vi.title || '',
          subtitle: [
            vi.authors?.[0],
            vi.publishedDate?.slice(0, 4)
          ].filter(Boolean).join(', '),
          imageUrl: enhanceGoogleBooksUrl(vi.imageLinks?.thumbnail),
          // Metadata for sorting
          _hasDescription: !!vi.description,
          _pageCount: vi.pageCount || 0,
        }
      })
      // Filter out results with no cover image
      .filter(r => r.imageUrl)
      // Sort: prefer results with richer metadata (real editions, not stubs)
      .sort((a, b) => {
        const aScore = (a._hasDescription ? 1 : 0) + (a._pageCount > 50 ? 1 : 0)
        const bScore = (b._hasDescription ? 1 : 0) + (b._pageCount > 50 ? 1 : 0)
        return bScore - aScore
      })
      .slice(0, 8)
  } catch {
    return []
  }
}

/**
 * Search books — Google Books + Open Library combined.
 * Always fetches both sources for better coverage of classics and translations.
 */
export async function searchBooks(query) {
  // Fetch both in parallel for speed
  const [gbResults, olResults] = await Promise.all([
    searchGoogleBooks(query),
    searchOpenLibrary(query),
  ])

  // Merge: Google Books first (generally better covers), then Open Library deduped
  const seenTitles = new Set(gbResults.map(r => r.title.toLowerCase()))
  const newOlResults = olResults.filter(r =>
    r.imageUrl && !seenTitles.has(r.title.toLowerCase())
  )

  return [...gbResults, ...newOlResults].slice(0, 12)
}

/**
 * Fetch the best available cover URL for a book title.
 * Used for refreshing existing review/wishlist covers.
 * Returns the enhanced URL or null if not found.
 * Validates the image is a real cover (>8KB) to avoid placeholders.
 */
export async function fetchBestBookCover(title) {
  try {
    const encoded = encodeURIComponent(title)
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${encoded}&maxResults=1`
    )
    if (!res.ok) return null
    const data = await res.json()
    const thumbnail = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail
    const url = enhanceGoogleBooksUrl(thumbnail)
    if (!url) return null

    // Verify this is a real cover, not a tiny placeholder
    const head = await fetch(url, { method: 'HEAD' })
    const size = parseInt(head.headers.get('content-length') || '0', 10)
    if (size < 8000) return null

    return url
  } catch {
    return null
  }
}

/**
 * Search albums via Deezer JSONP (free, no key)
 */
export async function searchAlbums(query) {
  const encoded = encodeURIComponent(query)
  const data = await jsonpFetch(
    `https://api.deezer.com/search/album?q=${encoded}&limit=8&output=jsonp`
  )

  return (data.data || []).map(album => ({
    id: album.id?.toString(),
    title: album.title,
    subtitle: album.artist?.name || '',
    imageUrl: album.cover_medium || album.cover || ''
  }))
}

/**
 * Upscale iTunes artwork URL from 100x100 to larger size
 */
function itunesArtwork(url, size = 400) {
  if (!url) return ''
  return url.replace('100x100bb', `${size}x${size}bb`)
}

/**
 * TMDB search helper — used for movies (and can be extended to TV)
 * Read token stored in env var, API key in Supabase Vault for Edge Function
 */
async function searchTMDB(query, type = 'movie') {
  const token = import.meta.env.VITE_TMDB_READ_TOKEN
  if (!token) return []

  const encoded = encodeURIComponent(query)
  const res = await fetch(
    `https://api.themoviedb.org/3/search/${type}?query=${encoded}&page=1&include_adult=false`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  const data = await res.json()

  return (data.results || []).slice(0, 8).map(item => ({
    id: item.id?.toString(),
    title: type === 'movie' ? item.title : item.name,
    subtitle: [
      (type === 'movie' ? item.release_date : item.first_air_date)?.slice(0, 4),
      item.original_language !== 'en' ? (item.original_title || item.original_name) : null
    ].filter(Boolean).join(' · '),
    imageUrl: item.poster_path
      ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
      : ''
  })).filter(r => r.imageUrl)
}

/**
 * Search movies via TMDB (comprehensive international coverage)
 */
export async function searchMovies(query) {
  return searchTMDB(query, 'movie')
}

/**
 * Search TV shows via TMDB (comprehensive coverage including streaming)
 */
export async function searchShows(query) {
  return searchTMDB(query, 'tv')
}

/**
 * Search podcasts via iTunes JSONP (free, no key)
 */
export async function searchPodcasts(query) {
  const encoded = encodeURIComponent(query)
  const data = await jsonpFetch(
    `https://itunes.apple.com/search?term=${encoded}&media=podcast&limit=8`
  )

  return (data.results || []).map(pod => ({
    id: pod.collectionId?.toString(),
    title: pod.collectionName,
    subtitle: pod.artistName || '',
    imageUrl: itunesArtwork(pod.artworkUrl100)
  }))
}

/**
 * Map tag/type to media type for API routing
 */
export const TAG_TO_MEDIA_TYPE = {
  book: 'book',
  movie: 'movie',
  show: 'show',
  album: 'album',
  podcast: 'podcast',
  performing_arts: null,
  exhibition: null,
  other: null,
}

/**
 * Map free-form wishlist type string to media type
 */
export function typeToMediaType(type) {
  if (!type) return null
  const t = type.toLowerCase().trim()
  if (/^(book|livre|roman)/.test(t)) return 'book'
  if (/^(movie|film)/.test(t)) return 'movie'
  if (/^(show|serie|séri)/.test(t)) return 'show'
  if (/^(album|music|musique|vinyl|vinyle)/.test(t)) return 'album'
  if (/^(podcast)/.test(t)) return 'podcast'
  return null
}

/**
 * Route search to the right API based on media type
 */
export async function searchByMediaType(query, mediaType) {
  switch (mediaType) {
    case 'book': return searchBooks(query)
    case 'album': return searchAlbums(query)
    case 'movie': return searchMovies(query)
    case 'show': return searchShows(query)
    case 'podcast': return searchPodcasts(query)
    default: return []
  }
}
