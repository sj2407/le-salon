import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'present' : 'MISSING',
    key: supabaseAnonKey ? 'present' : 'MISSING'
  })
  throw new Error('Missing Supabase configuration. Please check environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' }
})
