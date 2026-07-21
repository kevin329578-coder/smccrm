'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import Nav from '@/components/Nav'
import toast from 'react-hot-toast'
import type { Region, FranchiseeType } from '@/types'

export default function NewFranchiseePage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [form, setForm] = useState({
    region: '' as Region | '', type: '' as FranchiseeType | '',
    business_name: '', representative_name: '', business_reg_no: '', address: '', phone: '',
    bank_name: '', account_no: '', account_holder: '', tax_invoice_email: '', assigned_staff: '', joined_at: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.region || !form.type || !form.business_name.trim()) {
      toast.error('지역/유형/가맹점명은 필수입니다'); return
    }
    setSaving(true)
    const { data, error } = await supabase.from('franchisees').insert({
      region: form.region, type: form.type, business_name: form.business_name.trim(),
      representative_name: form.representative_name || null, business_reg_no: form.business_reg_no || null,
      address: form.address || null, phone: form.phone || null, bank_name: form.bank_name || null,
      account_no: form.account_no || null, account_holder: form.account_holder || null,
      tax_invoice_email: form.tax_invoice_email || null, assigned_staff: form.assigned_staff || null,
      joined_at: form.joined_at || null,
    }).select().single()
    setSaving(false)
    if (error) { toast.error('등록 실패: ' + error.message); return }
    toast.success('가맹점이 등록됐습니다')
    router.push(`/franchisees/${data.id}`)
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E8EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#6B7684', marginBottom: 6 }

  if (authLoading || !profile) return null

  return (
    <div>
      <Nav />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>가맹점 등록</h1>
        <div style={{ background: '#fff', border: '1px solid #E5E8EB', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>지역 *</label>
              <select value={form.region} onChange={e => set('region', e.target.value)} style={inp}>
                <option value="">선택</option>
                <option value="서울">서울</option>
                <option value="경기">경기</option>
              </select>
            </div>
            <div>
              <label style={lbl}>유형 *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} style={inp}>
                <option value="">선택</option>
                <option value="법인">법인</option>
                <option value="개인">개인</option>
              </select>
            </div>
          </div>
          {[
            ['business_name', '가맹점명(사업자명) *'], ['representative_name', '대표자명'],
            ['business_reg_no', '사업자등록번호'], ['address', '주소'], ['phone', '연락처'],
            ['bank_name', '금융기관명'], ['account_no', '계좌번호'], ['account_holder', '예금주명'],
            ['tax_invoice_email', '세금계산서 이메일'], ['assigned_staff', '담당자'], ['joined_at', '가입일 (YYYY-MM-DD)'],
          ].map(([key, label]) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={lbl}>{label}</label>
              <input value={(form as Record<string, string>)[key]} onChange={e => set(key, e.target.value)} style={inp} />
            </div>
          ))}
          <button onClick={save} disabled={saving}
            style={{ width: '100%', padding: 12, background: '#191F28', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '저장 중...' : '등록하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
