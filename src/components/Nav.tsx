'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const LINKS = [
  { href: '/', label: '통합 검색' },
  { href: '/companies', label: '운수사 목록' },
  { href: '/drivers', label: '기사 목록' },
  { href: '/franchisees/new', label: '가맹점 등록' },
]

export default function Nav() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #E5E8EB', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Cabsy CRM</div>
        {LINKS.map(l => (
          <Link key={l.href} href={l.href}
            style={{ fontSize: 14, fontWeight: pathname === l.href ? 700 : 500, color: pathname === l.href ? '#191F28' : '#6B7684', textDecoration: 'none' }}>
            {l.label}
          </Link>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#6B7684' }}>
        {profile?.name}
        <button onClick={signOut} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6B7684', fontSize: 13 }}>로그아웃</button>
      </div>
    </div>
  )
}
