import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url) {
console.error('VITE_SUPABASE_URL is missing')
throw new Error('Supabase URL missing')
}
if (!key) {
console.error('VITE_SUPABASE_ANON_KEY is missing')
throw new Error('Supabase anon key missing')
}
export const supabase = createClient(
  url,
  key,
  { auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
  } }
)