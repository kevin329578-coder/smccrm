'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import Nav from '@/components/Nav'
import VehicleFormModal from '@/components/VehicleFormModal'
import DriverFormModal from '@/components/DriverFormModal'
import type { Franchisee, Vehicle, Driver } from '@/types'

export default function FranchiseeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [franchisee, setFranchisee] = useState<Franchisee | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [vehicleModal, setVehicleModal] = useState<'new' | Vehicle | null>(null)
  const [driverModal, setDriverModal] = useState<'new' | Driver | null>(null)

  useEffect(() => { if (profile) load() }, [profile, id])

  async function load() {
    const [{ data: f }, { data: v }, { data: d }] = await Promise.all([
      supabase.from('franchisees').select('*').eq('id', id).single(),
      supabase.from('vehicles').select('*').eq('franchisee_id', id).order('created_at'),
      supabase.from('drivers').select('*').eq('franchisee_id', id).order('created_at'),
    ])
    setFranchisee(f)
    setVehicles(v || [])
    setDrivers(d || [])
  }

  if (authLoading || !profile || !franchisee) return null

  const vehicleName = (vehicleId?: string | null) => vehicles.find(v => v.id === vehicleId)?.plate_no || '-'

  return (
    <div>
      <Nav />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #E5E8EB', borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: '#F1F3F5', color: '#6B7684' }}>
              {franchisee.region} · {franchisee.type}
            </span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{franchisee.business_name}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, color: '#6B7684' }}>
            <div>대표자: {franchisee.representative_name || '-'}</div>
            <div>연락처: {franchisee.phone || '-'}</div>
            <div>사업자등록번호: {franchisee.business_reg_no || '-'}</div>
            <div>담당자: {franchisee.assigned_staff || '-'}</div>
            <div>주소: {franchisee.address || '-'}</div>
            <div>가입일: {franchisee.joined_at || '-'}</div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E5E8EB', borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>차량 ({vehicles.length}대)</div>
            <button onClick={() => setVehicleModal('new')}
              style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#EEA91F', color: '#fff', borderRadius: 8 }}>
              + 차량 추가
            </button>
          </div>
          {!vehicles.length ? <div style={{ color: '#ADB5BD', fontSize: 13 }}>등록된 차량이 없습니다</div> : vehicles.map(v => (
            <div key={v.id} onClick={() => setVehicleModal(v)}
              style={{ padding: '10px 0', borderBottom: '1px solid #F1F3F5', fontSize: 13, display: 'flex', gap: 12, cursor: 'pointer' }}>
              <span style={{ fontWeight: 600 }}>{v.plate_no}</span>
              <span style={{ color: '#6B7684' }}>{v.car_model}</span>
              <span style={{ marginLeft: 'auto', color: v.status === '운행중' ? '#059669' : '#ADB5BD' }}>{v.status}</span>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #E5E8EB', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>기사 ({drivers.length}명)</div>
            <button onClick={() => setDriverModal('new')}
              style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#EEA91F', color: '#fff', borderRadius: 8 }}>
              + 기사 추가
            </button>
          </div>
          {!drivers.length ? <div style={{ color: '#ADB5BD', fontSize: 13 }}>등록된 기사가 없습니다</div> : drivers.map(d => (
            <div key={d.id} onClick={() => setDriverModal(d)}
              style={{ padding: '10px 0', borderBottom: '1px solid #F1F3F5', fontSize: 13, display: 'flex', gap: 12, cursor: 'pointer' }}>
              <span style={{ fontWeight: 600 }}>{d.name}</span>
              <span style={{ color: '#6B7684' }}>담당차량: {vehicleName(d.vehicle_id)}</span>
              <span style={{ marginLeft: 'auto', color: d.call_status === '전환완료' ? '#059669' : d.call_status === '해지' ? '#F04452' : '#92400E' }}>
                {d.call_status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {vehicleModal && (
        <VehicleFormModal
          franchiseeId={id}
          vehicle={vehicleModal === 'new' ? undefined : vehicleModal}
          onClose={() => setVehicleModal(null)}
          onSaved={() => { setVehicleModal(null); load() }}
        />
      )}
      {driverModal && (
        <DriverFormModal
          franchiseeId={id}
          vehicles={vehicles}
          driver={driverModal === 'new' ? undefined : driverModal}
          onClose={() => setDriverModal(null)}
          onSaved={() => { setDriverModal(null); load() }}
        />
      )}
    </div>
  )
}
