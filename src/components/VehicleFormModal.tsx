'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Vehicle, VehicleStatus } from '@/types'

export default function VehicleFormModal({ franchiseeId, vehicle, onClose, onSaved }: {
  franchiseeId: string; vehicle?: Vehicle; onClose: () => void; onSaved: () => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState({
    plate_no: vehicle?.plate_no || '', car_model: vehicle?.car_model || '', color: vehicle?.color || '',
    meter_point: vehicle?.meter_point || '', decal_type: vehicle?.decal_type || '', light_type: vehicle?.light_type || '',
    is_new_or_converted: vehicle?.is_new_or_converted || '', added_at: vehicle?.added_at || '',
    terminated_at: vehicle?.terminated_at || '', status: (vehicle?.status || '운행중') as VehicleStatus,
    notes: vehicle?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.plate_no.trim()) { toast.error('차량번호는 필수입니다'); return }
    setSaving(true)
    const payload = {
      franchisee_id: franchiseeId, plate_no: form.plate_no.trim(),
      car_model: form.car_model || null, color: form.color || null, meter_point: form.meter_point || null,
      decal_type: form.decal_type || null, light_type: form.light_type || null,
      is_new_or_converted: form.is_new_or_converted || null, added_at: form.added_at || null,
      terminated_at: form.terminated_at || null, status: form.status, notes: form.notes || null,
    }
    const { error } = vehicle
      ? await supabase.from('vehicles').update(payload).eq('id', vehicle.id)
      : await supabase.from('vehicles').insert(payload)
    setSaving(false)
    if (error) { toast.error('저장 실패: ' + error.message); return }
    toast.success(vehicle ? '차량 정보가 수정됐습니다' : '차량이 등록됐습니다')
    onSaved()
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E8EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#6B7684', marginBottom: 6 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{vehicle ? '차량 정보 수정' : '차량 등록'}</div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>차량번호 *</label>
          <input value={form.plate_no} onChange={e => set('plate_no', e.target.value)} style={inp} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={lbl}>차종</label>
            <input value={form.car_model} onChange={e => set('car_model', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>색상</label>
            <input value={form.color} onChange={e => set('color', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>설치미터점</label>
            <input value={form.meter_point} onChange={e => set('meter_point', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>데칼</label>
            <input value={form.decal_type} onChange={e => set('decal_type', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>갓등</label>
            <input value={form.light_type} onChange={e => set('light_type', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>신규/전환</label>
            <input value={form.is_new_or_converted} onChange={e => set('is_new_or_converted', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>증차완료일</label>
            <input type="date" value={form.added_at} onChange={e => set('added_at', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>해지일</label>
            <input type="date" value={form.terminated_at} onChange={e => set('terminated_at', e.target.value)} style={inp} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>상태</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
            <option value="운행중">운행중</option>
            <option value="해지">해지</option>
          </select>
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
