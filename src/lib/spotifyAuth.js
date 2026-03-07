/**
 * Spotify PKCE authentication helpers.
 * Client ID comes from env; secrets stay server-side in Supabase Vault.
 */

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const SPOTIFY_SCOPES = 'user-top-read'

/**
 * Generate a random code verifier (43-128 chars, URL-safe).
 */
function generateCodeVerifier() {
  const array = new Uint8Array(64)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * SHA-256 hash → base64url.
 */
async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Start the Spotify PKCE flow: store verifier, redirect to Spotify.
 */
export async function startSpotifyConnect() {
  if (!SPOTIFY_CLIENT_ID) {
    return { ok: false, reason: 'not_configured' }
  }

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  // Spotify requires 127.0.0.1 instead of localhost (policy change April 2025)
  const origin = window.location.origin.replace('://localhost', '://127.0.0.1')
  const redirectUri = origin + '/my-corner'

  // Store for the callback
  sessionStorage.setItem('spotify_code_verifier', codeVerifier)
  sessionStorage.setItem('spotify_redirect_uri', redirectUri)

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

/**
 * Check URL for Spotify callback code and exchange it.
 * Returns true if a callback was handled, false otherwise.
 */
export function getSpotifyCallbackCode() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  if (!code) return null

  const codeVerifier = sessionStorage.getItem('spotify_code_verifier')
  const redirectUri = sessionStorage.getItem('spotify_redirect_uri')

  // Clean up URL and session
  const url = new URL(window.location)
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  window.history.replaceState({}, '', url)
  sessionStorage.removeItem('spotify_code_verifier')
  sessionStorage.removeItem('spotify_redirect_uri')

  if (!codeVerifier || !redirectUri) return null

  return { code, codeVerifier, redirectUri }
}
