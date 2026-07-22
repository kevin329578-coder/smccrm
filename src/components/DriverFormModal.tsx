'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Driver, Vehicle, CallStatus } from '@/types'

export default function DriverFormModal({ franchiseeId, vehicles, driver, onClose, onSaved }: {
  franchiseeId: string; vehicles: Vehicle[]; driver?: Driver; onClose: () => void; onSaved: () => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState({
    name: driver?.name || '', birth_date: driver?.birth_date || '', gender: driver?.gender || '',
    phone: driver?.phone || '', taxi_license_no: driver?.taxi_license_no || '',
    education_completed_at: driver?.education_completed_at || '', vehicle_id: driver?.vehicle_id || '',
    call_status: (driver?.call_status || '신청중') as CallStatus,
    call_converted_at: driver?.call_converted_at || '', call_terminated_at: driver?.call_terminated_at || '',
    call_termination_reason: driver?.call_termination_reason || '', notes: driver?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.name.trim()) { toast.error('기사 이름은 필수입니다'); return }
    setSaving(true)
    const payload = {
      franchisee_id: franchiseeId, vehicle_id: form.vehicle_id || null, name: form.name.trim(),
      birth_date: form.birth_date || null, gender: form.gender || null, phone: form.phone || null,
      taxi_license_no: form.taxi_license_no || null, education_completed_at: form.education_completed_at || null,
      call_status: form.call_status, call_converted_at: form.call_converted_at || null,
      call_terminated_at: form.call_terminated_at || null, call_termination_reason: form.call_termination_reason || null,
      notes: form.notes || null,
    }
    const { error } = driver
      ? await supabase.from('drivers').update(payload).eq('id', driver.id)
      : await supabase.from('drivers').insert(payload)
    setSaving(false)
    if (error) { toast.error('저장 실패: ' + error.message); return }
    toast.success(driver ? '기사 정보가 수정됐습니다' : '기사가 등록됐습니다')
    onSaved()
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E8EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#6B7684', marginBottom: 6 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{driver ? '기사 정보 수정' : '기사 등록'}</div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>이름 *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} style={inp} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={lbl}>생년월일</label>
            <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>성별</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)} style={inp}>
              <option value="">선택</option>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>
          </div>
          <div>
            <label style={lbl}>연락처</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>택시자격번호</label>
            <input value={form.taxi_license_no} onChange={e => set('taxi_license_no', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>교육수료일</label>
            <input type="date" value={form.education_completed_at} onChange={e => set('education_completed_at', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>담당 차량</label>
            <select value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)} style={inp}>
              <option value="">없음</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_no}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>콜전환 상태</label>
          <select value={form.call_status} onChange={e => set('call_status', e.target.value)} style={inp}>
            <option value="신청중">신청중</option>
            <option value="전환완료">전환완료</option>
            <option value="해지">해지</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={lbl}>전환일</label>
            <input type="date" value={form.call_converted_at} onChange={e => set('call_converted_at', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>해지일</label>
            <input type="date" value={form.call_terminated_at} onChange={e => set('call_terminated_at', e.target.value)} style={inp} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>해지사유</label>
          <input value={form.call_termination_reason} onChange={e => set('call_termination_reason', e.target.value)} style={inp} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>비고</label>
          <input value={form.notes} onChange={e => set('notes', e.target.value)} style={inp} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: '1px solid #E5E8EB', background: '#F9FAFB', color: '#6B7684', borderRadius: 10 }}>취소</button>
          <button onClick={save} disabled={saving}
            style={{ flex: 2, padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#191F28', color: '#fff', borderRadius: 10, opacity: saving ? 0.7 : 1 }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
