'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!username.trim() || !password.trim()) { toast.error('아이디와 비밀번호를 입력해주세요'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: `${username.trim()}@cabsy-crm.internal`, password,
    })
    setLoading(false)
    if (error) { toast.error('로그인 실패: 아이디 또는 비밀번호를 확인해주세요'); return }
    router.push('/')
  }

  const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1.5px solid #E5E8EB', borderRadius: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #E5E8EB', borderRadius: 20, padding: 40, width: '100%', maxWidth: 380 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Cabsy CRM</div>
        <div style={{ marginBottom: 14 }}>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="아이디"
            onKeyDown={e => { if (e.key === 'Enter') handleLogin() }} style={inp} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호"
            onKeyDown={e => { if (e.key === 'Enter') handleLogin() }} style={inp} />
        </div>
        <button onClick={handleLogin} disabled={loading}
          style={{ width: '100%', padding: 14, background: '#191F28', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </div>
    </div>
  )
}
