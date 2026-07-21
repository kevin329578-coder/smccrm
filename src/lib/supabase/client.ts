import { createBrowserClient } from '@supabase/ssr'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function isSupabaseConfigured() {
  return !!(rawUrl && !rawUrl.startsWith('your_') && rawKey && !rawKey.startsWith('your_'))
}

const SUPABASE_URL = (rawUrl && !rawUrl.startsWith('your_')) ? rawUrl : 'https://placeholder.supabase.co'
const SUPABASE_KEY = (rawKey && !rawKey.startsWith('your_')) ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
}
