import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  const supabaseUrl = rawUrl.trim().replace(/\/+$/, '') || 'https://placeholder.supabase.co'
  const supabaseKey = rawKey.trim() || 'placeholder-key'

  return createBrowserClient(supabaseUrl, supabaseKey)
}
