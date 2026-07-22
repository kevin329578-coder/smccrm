'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import Nav from '@/components/Nav'
import type { Driver, Region, CallStatus } from '@/types'

type DriverRow = Driver & { franchisee: { id: string; business_name: string; region: Region; type: string } | null }

export default function DriversPage() {
  const { profile, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<Region | ''>('')
  const [callStatus, setCallStatus] = useState<CallStatus | ''>('')
  const [results, setResults] = useState<DriverRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (profile) search() }, [profile, region, callStatus])

  async function search() {
    setLoading(true)
    let req = supabase.from('drivers')
      .select('*, franchisee:franchisees!inner(id, business_name, region, type)')
      .order('created_at', { ascending: false }).limit(200)
    if (region) req = req.eq('franchisee.region', region)
    if (callStatus) req = req.eq('call_status', callStatus)
    if (query.trim()) req = req.or(`name.ilike.%${query}%,phone.ilike.%${query}%,taxi_license_no.ilike.%${query}%`)
    const { data } = await req
    setResults((data as unknown as DriverRow[]) || [])
    setLoading(false)
  }

  const selectStyle: React.CSSProperties = { padding: '10px 12px', border: '1.5px solid #E5E8EB', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff' }
  const callColor = (s: string) => s === '전환완료' ? '#059669' : s === '해지' ? '#F04452' : '#92400E'
  const callBg = (s: string) => s === '전환완료' ? '#E6FAF5' : s === '해지' ? '#FEE8EA' : '#FEF4E6'

  if (authLoading || !profile) return null

  return (
    <div>
      <Nav />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>기사 목록</h1>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') search() }}
            placeholder="기사명·연락처·택시자격번호로 검색"
            style={{ flex: '2 1 240px', padding: '10px 12px', border: '1.5px solid #E5E8EB', borderRadius: 10, fontSize: 14, outline: 'none' }} />
          <select value={region} onChange={e => setRegion(e.target.value as Region | '')} style={selectStyle}>
            <option value="">전체 지역</option>
            <option value="서울">서울</option>
            <option value="경기">경기</option>
          </select>
          <select value={callStatus} onChange={e => setCallStatus(e.target.value as CallStatus | '')} style={selectStyle}>
            <option value="">전체 콜상태</option>
            <option value="신청중">신청중</option>
            <option value="전환완료">전환완료</option>
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
          ) : results.map(d => (
            <a key={d.id} href={d.franchisee ? `/franchisees/${d.franchisee.id}` : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #F1F3F5', textDecoration: 'none', color: 'inherit', cursor: d.franchisee ? 'pointer' : 'default' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: '#F1F3F5', color: '#6B7684' }}>
                {d.franchisee?.region} · {d.franchisee?.type}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: '#ADB5BD', marginTop: 2 }}>
                  {d.franchisee?.business_name} · {d.phone || '연락처 없음'}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: callBg(d.call_status), color: callColor(d.call_status) }}>
                {d.call_status}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
