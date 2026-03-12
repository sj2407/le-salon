import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Module-level cache — fetched once per session, shared across tab switches
const cache = {}

/**
 * Fetches showcase (Sarah's) data for a given tab via the get_showcase_data() RPC.
 * Caches results at module level so repeat calls are instant.
 * Graceful fallback: returns null on any failure (old EmptyStateFantom shows).
 */
export function useShowcaseData(tab) {
  const [data, setData] = useState(cache[tab] || null)
  const [loading, setLoading] = useState(!cache[tab])

  useEffect(() => {
    if (!tab) return
    if (cache[tab]) {
      setData(cache[tab])
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      try {
        const { data: result, error } = await supabase.rpc('get_showcase_data', { tab_name: tab })
        if (error) throw error
        if (!cancelled) {
          cache[tab] = result
          setData(result)
        }
      } catch {
        // Graceful fallback — preview won't show, normal empty state renders
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [tab])

  return { data, loading }
}
