// Registry of module-level caches that hold the signed-in user's data.
//
// Pages like Reviews and LaListe keep module-scoped caches so returning to a tab
// renders instantly. Those caches survive unmount AND sign-out, so on a shared
// device (or the QA/reviewer accounts) the next user could briefly see the
// previous user's cached data before the refetch lands.
//
// Each such page registers a clear function here; AuthContext calls
// clearAllSessionCaches() whenever the auth user changes (sign-out or account
// switch), guaranteeing a cache miss for the new user. Portrait already keys its
// own cache by userId, so it does not need to register.

const clearers = new Set()

export const registerSessionCache = (clearFn) => {
  clearers.add(clearFn)
  return () => clearers.delete(clearFn)
}

export const clearAllSessionCaches = () => {
  for (const clear of clearers) {
    try { clear() } catch { /* a single bad clearer must not block the rest */ }
  }
}
