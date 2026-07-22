'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import Nav from '@/components/Nav'
import type { Franchisee, Region, FranchiseeStatus } from '@/types'

export default function CompaniesPage() {
  const { profile, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<Region | ''>('')
  const [status, setStatus] = useState<FranchiseeStatus | ''>('')
  const [results, setResults] = useState<Franchisee[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (profile) search() }, [profile, region, status])

  async function search() {
    setLoading(true)
    let req = supabase.from('franchisees').select('*').eq('type', '법인').order('created_at', { ascending: false }).limit(200)
    if (region) req = req.eq('region', region)
    if (status) req = req.eq('status', status)
    if (query.trim()) req = req.or(`business_name.ilike.%${query}%,representative_name.ilike.%${query}%,phone.ilike.%${query}%`)
    const { data } = await req
    setResults(data || [])
    setLoading(false)
  }

  const selectStyle: React.CSSProperties = { padding: '10px 12px', border: '1.5px solid #E5E8EB', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff' }

  if (authLoading || !profile) return null

  return (
    <div>
      <Nav />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>운수사 목록</h1>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') search() }}
            placeholder="운수사명·대표자명·연락처로 검색"
            style={{ flex: '2 1 240px', padding: '10px 12px', border: '1.5px solid #E5E8EB', borderRadius: 10, fontSize: 14, outline: 'none' }} />
          <select value={region} onChange={e => setRegion(e.target.value as Region | '')} style={selectStyle}>
            <option value="">전체 지역</option>
            <option value="서울">서울</option>
            <option value="경기">경기</option>
          </select>
          <select value={status} onChange={e => setStatus(e.target.value as FranchiseeStatus | '')} style={selectStyle}>
            <option value="">전체 상태</option>
            <option value="활성">활성</option>
            <option value="해지">해지</option>
          </select>
          <button onClick={search} style={{ padding: '10px 18px', background: '#191F28', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>검색</button>
        </div>
        <div style={{ fontSize: 13, color: '#6B7684', marginBottom: 10 }}>총 {results.length}건</div>
        <div style={{ background: '#fff', border: '1px solid #E5E8EB', borderRadius: 16, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#ADB5BD' }}>검색 중...</div>
          ) : !results.length ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#ADB5BD' }}>결과가 없습니다</div>
          ) : results.map(f => (
            <Link key={f.id} href={`/franchisees/${f.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #F1F3F5', textDecoration: 'none', color: 'inherit' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: '#F1F3F5', color: '#6B7684' }}>{f.region}</span>
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
