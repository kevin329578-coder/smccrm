'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import Nav from '@/components/Nav'
import type { Franchisee } from '@/types'

export default function SearchPage() {
  const { profile, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Franchisee[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (profile) search('') }, [profile])

  async function search(q: string) {
    setLoading(true)
    let req = supabase.from('franchisees').select('*').order('created_at', { ascending: false }).limit(50)
    if (q.trim()) {
      req = req.or(`business_name.ilike.%${q}%,representative_name.ilike.%${q}%,phone.ilike.%${q}%`)
    }
    const { data } = await req
    setResults(data || [])
    setLoading(false)
  }

  if (authLoading || !profile) return null

  return (
    <div>
      <Nav />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>통합 검색</h1>
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') search(query) }}
          placeholder="가맹점명·대표자명·연락처로 검색"
          style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E8EB', borderRadius: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 20 }} />
        <div style={{ background: '#fff', border: '1px solid #E5E8EB', borderRadius: 16, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#ADB5BD' }}>검색 중...</div>
          ) : !results.length ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#ADB5BD' }}>결과가 없습니다</div>
          ) : results.map(f => (
            <Link key={f.id} href={`/franchisees/${f.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #F1F3F5', textDecoration: 'none', color: 'inherit' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: '#F1F3F5', color: '#6B7684' }}>
                {f.region} · {f.type}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{f.business_name}</div>
                <div style={{ fontSize: 12, color: '#ADB5BD', marginTop: 2 }}>{f.representative_name} · {f.phone}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: f.status === '활성' ? '#E6FAF5' : '#F1F3F5', color: f.status === '활성' ? '#059669' : '#6B7684' }}>
                {f.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
