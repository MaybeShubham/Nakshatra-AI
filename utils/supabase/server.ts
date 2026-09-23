import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = cookies()

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  const supabaseUrl = rawUrl.trim().replace(/\/+$/, '') || 'https://placeholder.supabase.co'
  const supabaseKey = rawKey.trim() || 'placeholder-key'

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignored if called from Server Component
          }
        },
      },
    }
  )
}
