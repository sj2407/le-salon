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
 */
async function searchOpenLibrary(query) {
  const encoded = encodeURIComponent(query)
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encoded}&limit=8&fields=key,title,author_name,cover_i,first_publish_year`
  )
  const data = await res.json()

  return (data.docs || []).map(doc => ({
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
 * Search books via Google Books (free fallback, no key needed)
 */
async function searchGoogleBooks(query) {
  try {
    const encoded = encodeURIComponent(query)
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encoded}&maxResults=8`
    )
    if (!res.ok) return []
    const data = await res.json()

    return (data.items || []).map(item => {
      const vi = item.volumeInfo || {}
      return {
        id: `gb_${item.id}`,
        title: vi.title || '',
        subtitle: [
          vi.authors?.[0],
          vi.publishedDate?.slice(0, 4)
        ].filter(Boolean).join(', '),
        imageUrl: vi.imageLinks?.thumbnail?.replace('http://', 'https://') || ''
      }
    })
  } catch {
    return []
  }
}

/**
 * Search books — Open Library first, Google Books fallback for more results
 */
export async function searchBooks(query) {
  const olResults = await searchOpenLibrary(query)
  // If Open Library returned enough results with covers, use those
  const withCovers = olResults.filter(r => r.imageUrl)
  if (withCovers.length >= 3) return olResults

  // Otherwise, also try Google Books and merge
  const gbResults = await searchGoogleBooks(query)
  // Deduplicate by title (case-insensitive)
  const seenTitles = new Set(olResults.map(r => r.title.toLowerCase()))
  const newResults = gbResults.filter(r => !seenTitles.has(r.title.toLowerCase()))

  return [...olResults, ...newResults]
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
