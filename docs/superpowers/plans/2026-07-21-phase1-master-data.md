# Phase 1: 가맹점/차량/기사 마스터 데이터 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 가맹점(법인/개인)·차량·기사 데이터를 하나의 DB로 통합하고, 내부 팀이 로그인해서 통합 검색 +
가맹점 상세(소속 차량/기사)를 볼 수 있게 하며, 서울법인 가맹점 데이터를 우선 마이그레이션해 실제
동작을 검증한다.

**이번 계획의 축소된 범위 (명시적 결정):** 스프레드시트 22개 전체와 차량/기사 등록 폼까지 한 계획에
다 넣으면 계획 자체가 지나치게 커지고 컬럼 인덱스 실수 위험도 커진다. 이번 계획은 (1) 전체 스키마
(2) 인증 (3) 통합 검색 + 가맹점 상세 조회 (4) 가맹점 등록 폼 (5) **서울법인 가맹점 정보 시트 1개**의
마이그레이션까지만 다룬다. 아래는 이번 계획에 포함하지 않고, 이 계획이 끝난 뒤 검증된 패턴을 그대로
반복해 별도 후속 작업으로 진행한다:
- 차량/기사 등록·수정 폼 (마이그레이션으로 들어온 데이터를 우선 조회하며 실사용 우선순위를 다시 확인)
- 법인/개인 전용 상세 필드(franchisee_corporate_details, franchisee_individual_details) 입력 폼
- 나머지 21개 시트(경기법인, 서울/경기 개인, 차량 증차/해지, 기사 콜전환/해지) 마이그레이션

**Architecture:** Next.js 16 App Router + Supabase(Postgres+Auth), 모빌잡스와 동일한 인증 미들웨어 패턴
(`src/proxy.ts` + `AuthProvider`)을 그대로 재사용하되 역할 구분 없이 단일 staff 로그인만 둔다. 스타일은
모빌잡스와 동일하게 인라인 `style={{...}}` 객체를 쓴다(Tailwind는 스캐폴딩에만 남아있고 실사용 안 함).

**Tech Stack:** Next.js 16.2.10, React 19, TypeScript, Supabase(`@supabase/ssr`, `@supabase/supabase-js`),
react-hot-toast. 테스트 프레임워크 없음 — 검증은 `npm run build` + Supabase REST API 직접 쿼리.

## Global Constraints

- 프로젝트 루트: `C:\Users\SMC\Desktop\케빈의 프로젝트\SMC_CRM\cabsy-crm`
- `.env.local`은 이미 설정됨 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- `src/lib/supabase/client.ts`, `server.ts`, `service.ts`는 이미 생성됨 (모빌잡스와 동일한 패턴)
- 원본 참고 파일: `C:\Users\SMC\Desktop\케빈의 프로젝트\SMC_CRM\캡시 사업운영 관리.xlsx` (git에 커밋 금지 — 민감정보 포함)
- 지역은 `'서울' | '경기'`, 유형은 `'법인' | '개인'` 두 값만 허용
- 주민등록번호는 반드시 pgcrypto로 암호화 저장, 평문으로 클라이언트에 내려주지 않음 (목록/상세 화면엔 마스킹만 표시)
- DDL(테이블 생성)은 에이전트가 직접 실행할 수 없음 — 사용자가 Supabase 대시보드 SQL Editor에서 실행

---

### Task 1: DB 스키마

**Files:**
- Create: `supabase_schema.sql`

**Interfaces:**
- Produces: `profiles`, `franchisees`, `franchisee_corporate_details`, `franchisee_individual_details`,
  `vehicles`, `drivers` 테이블. 이후 모든 태스크가 이 스키마를 전제로 한다.

- [ ] **Step 1: 스키마 SQL 작성**

`supabase_schema.sql` 새로 생성:

```sql
-- Cabsy CRM 스키마
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.

create extension if not exists pgcrypto;

-- 내부 직원 계정 (권한 구분 없음, 공개 회원가입 없음 — scripts/create-staff.mjs로만 생성)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  name text not null,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "로그인 시 전체 프로필 조회" on public.profiles for select to authenticated using (true);

-- 가맹점 (법인/개인 공통 필드)
create table public.franchisees (
  id uuid default gen_random_uuid() primary key,
  region text not null check (region in ('서울', '경기')),
  type text not null check (type in ('법인', '개인')),
  business_name text not null,
  representative_name text,
  business_reg_no text,
  address text,
  phone text,
  bank_name text,
  account_no text,
  account_holder text,
  tax_invoice_email text,
  assigned_staff text,
  joined_at date,
  status text not null default '활성' check (status in ('활성', '해지')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.franchisees enable row level security;
create policy "직원 조회" on public.franchisees for select to authenticated using (true);
create policy "직원 등록" on public.franchisees for insert to authenticated with check (true);
create policy "직원 수정" on public.franchisees for update to authenticated using (true);
create policy "직원 삭제" on public.franchisees for delete to authenticated using (true);

-- 법인 전용 상세 (1:1)
create table public.franchisee_corporate_details (
  franchisee_id uuid references public.franchisees(id) on delete cascade primary key,
  vehicle_manager_name text,
  vehicle_manager_email text,
  vehicle_manager_phone text,
  settlement_manager_name text,
  settlement_manager_email text,
  settlement_manager_phone text,
  region_hq text,
  business_type text,
  business_item text,
  barobill_registered boolean default false
);
alter table public.franchisee_corporate_details enable row level security;
create policy "직원 전체 접근" on public.franchisee_corporate_details for all to authenticated using (true) with check (true);

-- 개인 전용 상세 (1:1)
create table public.franchisee_individual_details (
  franchisee_id uuid references public.franchisees(id) on delete cascade primary key,
  resident_reg_no_enc bytea,
  gender text,
  birth_date date,
  tax_reverse_invoice_email text,
  taxpayer_status text,
  reverse_invoice_agreed boolean default false,
  barobill_registered boolean default false,
  cms_start_month text,
  cms_account text,
  esigned_at date,
  disclosure_provided_at date,
  poa_provided boolean default false,
  consignment_agreed boolean default false,
  privacy_consent boolean default false
);
alter table public.franchisee_individual_details enable row level security;
create policy "직원 전체 접근" on public.franchisee_individual_details for all to authenticated using (true) with check (true);

-- 주민등록번호 암/복호화 헬퍼 (키는 앱에서 환경변수로 전달)
create or replace function public.encrypt_rrn(rrn text, key text)
returns bytea language sql immutable as $$
  select pgp_sym_encrypt(rrn, key)
$$;

create or replace function public.decrypt_rrn(enc bytea, key text)
returns text language sql immutable as $$
  select pgp_sym_decrypt(enc, key)
$$;

-- 차량
create table public.vehicles (
  id uuid default gen_random_uuid() primary key,
  franchisee_id uuid references public.franchisees(id) on delete cascade not null,
  plate_no text not null,
  car_model text,
  color text,
  meter_point text,
  decal_type text,
  light_type text,
  is_new_or_converted text,
  added_at date,
  terminated_at date,
  status text not null default '운행중' check (status in ('운행중', '해지')),
  notes text,
  created_at timestamptz default now()
);
alter table public.vehicles enable row level security;
create policy "직원 전체 접근" on public.vehicles for all to authenticated using (true) with check (true);

-- 기사
create table public.drivers (
  id uuid default gen_random_uuid() primary key,
  franchisee_id uuid references public.franchisees(id) on delete cascade not null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  name text not null,
  birth_date date,
  gender text,
  phone text,
  taxi_license_no text,
  education_completed_at date,
  call_status text not null default '신청중' check (call_status in ('신청중', '전환완료', '해지')),
  call_converted_at date,
  call_terminated_at date,
  call_termination_reason text,
  notes text,
  created_at timestamptz default now()
);
alter table public.drivers enable row level security;
create policy "직원 전체 접근" on public.drivers for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: 커밋**

```bash
git add supabase_schema.sql
git commit -m "add initial database schema"
```

---

### Task 2: TypeScript 타입

**Files:**
- Create: `src/types/index.ts`

**Interfaces:**
- Consumes: Task 1의 테이블 구조
- Produces: `Franchisee`, `FranchiseeCorporateDetails`, `FranchiseeIndividualDetails`, `Vehicle`, `Driver`,
  `Profile` 타입 — 이후 모든 화면 태스크가 이 타입을 사용한다.

- [ ] **Step 1: 타입 정의**

`src/types/index.ts` 새로 생성:

```typescript
export type Region = '서울' | '경기'
export type FranchiseeType = '법인' | '개인'
export type FranchiseeStatus = '활성' | '해지'
export type VehicleStatus = '운행중' | '해지'
export type CallStatus = '신청중' | '전환완료' | '해지'

export interface Profile {
  id: string
  username: string
  name: string
  created_at: string
}

export interface Franchisee {
  id: string
  region: Region
  type: FranchiseeType
  business_name: string
  representative_name?: string
  business_reg_no?: string
  address?: string
  phone?: string
  bank_name?: string
  account_no?: string
  account_holder?: string
  tax_invoice_email?: string
  assigned_staff?: string
  joined_at?: string
  status: FranchiseeStatus
  notes?: string
  created_at: string
  updated_at: string
}

export interface FranchiseeCorporateDetails {
  franchisee_id: string
  vehicle_manager_name?: string
  vehicle_manager_email?: string
  vehicle_manager_phone?: string
  settlement_manager_name?: string
  settlement_manager_email?: string
  settlement_manager_phone?: string
  region_hq?: string
  business_type?: string
  business_item?: string
  barobill_registered: boolean
}

export interface FranchiseeIndividualDetails {
  franchisee_id: string
  gender?: string
  birth_date?: string
  tax_reverse_invoice_email?: string
  taxpayer_status?: string
  reverse_invoice_agreed: boolean
  barobill_registered: boolean
  cms_start_month?: string
  cms_account?: string
  esigned_at?: string
  disclosure_provided_at?: string
  poa_provided: boolean
  consignment_agreed: boolean
  privacy_consent: boolean
}

export interface Vehicle {
  id: string
  franchisee_id: string
  plate_no: string
  car_model?: string
  color?: string
  meter_point?: string
  decal_type?: string
  light_type?: string
  is_new_or_converted?: string
  added_at?: string
  terminated_at?: string
  status: VehicleStatus
  notes?: string
  created_at: string
}

export interface Driver {
  id: string
  franchisee_id: string
  vehicle_id?: string | null
  name: string
  birth_date?: string
  gender?: string
  phone?: string
  taxi_license_no?: string
  education_completed_at?: string
  call_status: CallStatus
  call_converted_at?: string
  call_terminated_at?: string
  call_termination_reason?: string
  notes?: string
  created_at: string
}
```

- [ ] **Step 2: 빌드로 확인**

Run: `cd "C:/Users/SMC/Desktop/케빈의 프로젝트/SMC_CRM/cabsy-crm" && npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: 커밋**

```bash
git add src/types/index.ts
git commit -m "add core TypeScript types"
```

---

### Task 3: 인증 (미들웨어 + 로그인 + 직원 계정 생성 스크립트)

**Files:**
- Create: `src/proxy.ts`
- Create: `src/lib/auth-context.tsx`
- Create: `src/app/login/page.tsx`
- Create: `scripts/create-staff.mjs`

**Interfaces:**
- Consumes: `Profile` 타입 (Task 2), `src/lib/supabase/client.ts`/`server.ts` (이미 존재)
- Produces: `useAuth()` 훅 — Task 4 이후 레이아웃/모든 인증 화면에서 사용

- [ ] **Step 1: 미들웨어 작성 (모빌잡스 패턴, getUser() 사용 — getSession() 금지)**

`src/proxy.ts` 새로 생성:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname.startsWith('/login')

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user) {
    supabaseResponse.headers.set('Cache-Control', 'no-store, must-revalidate')
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: Auth context 작성**

`src/lib/auth-context.tsx` 새로 생성:

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface AuthContext {
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContext>({ profile: null, loading: true, signOut: async () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        setProfile(data)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return <AuthContext.Provider value={{ profile, loading, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
```

- [ ] **Step 3: 로그인 페이지 작성**

`src/app/login/page.tsx` 새로 생성:

```typescript
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
```

- [ ] **Step 4: 직원 계정 생성 스크립트**

`scripts/create-staff.mjs` 새로 생성:

```javascript
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(join(__dir, '../.env.local'), 'utf8')
    .split(/\r?\n/).filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }

// 사용법: node scripts/create-staff.mjs <username> <password> <name>
const [username, password, name] = process.argv.slice(2)
if (!username || !password || !name) {
  console.log('사용법: node scripts/create-staff.mjs <username> <password> <name>')
  process.exit(1)
}

async function main() {
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST', headers,
    body: JSON.stringify({ email: `${username}@cabsy-crm.internal`, password, email_confirm: true }),
  })
  const authData = await authRes.json()
  if (!authRes.ok) { console.log('계정 생성 실패:', authData.message); return }

  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST', headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ id: authData.id, username, name }),
  })
  if (!profileRes.ok) { console.log('프로필 생성 실패:', await profileRes.text()); return }

  console.log(`완료: ${username} / ${name}`)
}

main()
```

- [ ] **Step 5: 빌드로 확인**

Run: `cd "C:/Users/SMC/Desktop/케빈의 프로젝트/SMC_CRM/cabsy-crm" && npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 6: 커밋**

```bash
git add src/proxy.ts src/lib/auth-context.tsx "src/app/login/page.tsx" scripts/create-staff.mjs
git commit -m "add authentication (middleware, login page, staff account script)"
```

---

### Task 4: 레이아웃 + 내비게이션

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/Nav.tsx`

**Interfaces:**
- Consumes: `AuthProvider`, `useAuth()` (Task 3)

- [ ] **Step 1: 루트 레이아웃에 AuthProvider + Toaster 적용**

`src/app/layout.tsx` 전체를 다음으로 교체 (기존 생성된 폰트/메타데이터 설정은 유지하되 body 내부만 교체):

```typescript
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cabsy CRM",
  description: "Cabsy 내부 가맹점/차량/기사 관리 시스템",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: 내비게이션 컴포넌트 작성**

`src/components/Nav.tsx` 새로 생성:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const LINKS = [
  { href: '/', label: '통합 검색' },
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
```

- [ ] **Step 3: 빌드로 확인**

Run: `cd "C:/Users/SMC/Desktop/케빈의 프로젝트/SMC_CRM/cabsy-crm" && npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 4: 커밋**

```bash
git add src/app/layout.tsx src/components/Nav.tsx
git commit -m "add root layout with auth provider and navigation"
```

---

### Task 5: 통합 검색 화면

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `Franchisee`, `Vehicle`, `Driver` 타입 (Task 2), `Nav` (Task 4)
- Produces: 없음 (최상위 화면)

- [ ] **Step 1: 통합 검색 페이지 작성**

`src/app/page.tsx` 전체를 다음으로 교체:

```typescript
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
```

- [ ] **Step 2: 빌드로 확인**

Run: `cd "C:/Users/SMC/Desktop/케빈의 프로젝트/SMC_CRM/cabsy-crm" && npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: 커밋**

```bash
git add src/app/page.tsx
git commit -m "add unified search page"
```

---

### Task 6: 가맹점 상세 화면

**Files:**
- Create: `src/app/franchisees/[id]/page.tsx`

**Interfaces:**
- Consumes: `Franchisee`, `Vehicle`, `Driver` 타입 (Task 2)

- [ ] **Step 1: 상세 페이지 작성**

`src/app/franchisees/[id]/page.tsx` 새로 생성:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import Nav from '@/components/Nav'
import type { Franchisee, Vehicle, Driver } from '@/types'

export default function FranchiseeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [franchisee, setFranchisee] = useState<Franchisee | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])

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
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>차량 ({vehicles.length}대)</div>
          {!vehicles.length ? <div style={{ color: '#ADB5BD', fontSize: 13 }}>등록된 차량이 없습니다</div> : vehicles.map(v => (
            <div key={v.id} style={{ padding: '10px 0', borderBottom: '1px solid #F1F3F5', fontSize: 13, display: 'flex', gap: 12 }}>
              <span style={{ fontWeight: 600 }}>{v.plate_no}</span>
              <span style={{ color: '#6B7684' }}>{v.car_model}</span>
              <span style={{ marginLeft: 'auto', color: v.status === '운행중' ? '#059669' : '#ADB5BD' }}>{v.status}</span>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #E5E8EB', borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>기사 ({drivers.length}명)</div>
          {!drivers.length ? <div style={{ color: '#ADB5BD', fontSize: 13 }}>등록된 기사가 없습니다</div> : drivers.map(d => (
            <div key={d.id} style={{ padding: '10px 0', borderBottom: '1px solid #F1F3F5', fontSize: 13, display: 'flex', gap: 12 }}>
              <span style={{ fontWeight: 600 }}>{d.name}</span>
              <span style={{ color: '#6B7684' }}>담당차량: {vehicleName(d.vehicle_id)}</span>
              <span style={{ marginLeft: 'auto', color: d.call_status === '전환완료' ? '#059669' : d.call_status === '해지' ? '#F04452' : '#92400E' }}>
                {d.call_status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 빌드로 확인**

Run: `cd "C:/Users/SMC/Desktop/케빈의 프로젝트/SMC_CRM/cabsy-crm" && npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: 커밋**

```bash
git add "src/app/franchisees/[id]/page.tsx"
git commit -m "add franchisee detail page with vehicles and drivers"
```

---

### Task 7: 가맹점 등록 폼

**Files:**
- Create: `src/app/franchisees/new/page.tsx`

**Interfaces:**
- Consumes: `Franchisee` 타입 (Task 2)

- [ ] **Step 1: 등록 폼 작성 (법인/개인 공통 필드만 — 상세 필드는 이후 별도 확장 가능하도록 notes로 우선 수용)**

`src/app/franchisees/new/page.tsx` 새로 생성:

```typescript
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
```

주의: 법인/개인 전용 상세 필드(franchisee_corporate_details, franchisee_individual_details)와 차량/기사
등록 폼은 이 태스크 범위에 없다 — Phase 1 1차 목표는 "공통 필드로 가맹점을 만들고 상세에서 확인하는
최소 동작"까지이며, 전용 상세 필드 입력 폼은 Task 9(마이그레이션) 이후 실제 사용 패턴을 보고 우선순위를
정한다 (YAGNI — 지금 다 만들면 이 태스크가 지나치게 커짐).

- [ ] **Step 2: 빌드로 확인**

Run: `cd "C:/Users/SMC/Desktop/케빈의 프로젝트/SMC_CRM/cabsy-crm" && npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: 커밋**

```bash
git add "src/app/franchisees/new/page.tsx"
git commit -m "add franchisee creation form"
```

---

### Task 8: 데이터 마이그레이션 스크립트

**Files:**
- Create: `scripts/migrate_xlsx.py`

**Interfaces:**
- Consumes: Task 1의 스키마, 원본 xlsx 파일

- [ ] **Step 1: 마이그레이션 스크립트 작성**

`scripts/migrate_xlsx.py` 새로 생성 (법인 가맹점 정보만 우선 마이그레이션 — 나머지 시트는 이 스크립트를
템플릿 삼아 이후 확장):

```python
import sys, os, json
sys.stdout.reconfigure(encoding='utf-8')
import openpyxl
import urllib.request

XLSX_PATH = r"C:\Users\SMC\Desktop\케빈의 프로젝트\SMC_CRM\캡시 사업운영 관리.xlsx"
ENV_PATH = os.path.join(os.path.dirname(__file__), '..', '.env.local')

env = {}
with open(ENV_PATH, encoding='utf-8') as f:
    for line in f:
        if '=' in line:
            k, v = line.strip().split('=', 1)
            env[k] = v

SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

def insert_franchisee(row):
    body = json.dumps(row).encode('utf-8')
    req = urllib.request.Request(
        SUPABASE_URL + '/rest/v1/franchisees',
        data=body, method='POST',
        headers={
            'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}',
            'Content-Type': 'application/json', 'Prefer': 'return=representation',
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def to_text(v):
    if v is None:
        return None
    return str(v).strip() or None

def main():
    wb = openpyxl.load_workbook(XLSX_PATH, data_only=True, read_only=True)
    ws = wb['가맹점 정보(서울법인)']
    inserted, skipped = 0, 0
    log_path = os.path.join(os.path.dirname(__file__), 'migrate_log.txt')
    with open(log_path, 'w', encoding='utf-8') as log:
        # 실제 헤더는 4행 (Task 1 설계 문서의 스프레드시트 조사 결과 기준), 데이터는 5행부터
        for row in ws.iter_rows(min_row=5, values_only=True):
            business_name = to_text(row[7])  # 사업자명(정식)
            if not business_name:
                skipped += 1
                continue
            payload = {
                'region': '서울',
                'type': '법인',
                'business_name': business_name,
                'representative_name': to_text(row[8]),
                'business_reg_no': to_text(row[6]),
                'address': to_text(row[16]),
                'phone': to_text(row[10]),
                'bank_name': to_text(row[19]),
                'account_no': to_text(row[20]),
                'account_holder': to_text(row[21]),
                'tax_invoice_email': to_text(row[22]),
                'status': '활성',
            }
            try:
                insert_franchisee(payload)
                inserted += 1
            except Exception as e:
                skipped += 1
                log.write(f"실패: {business_name} - {e}\n")
    print(f'완료. 삽입 {inserted}건, 스킵 {skipped}건. 로그: {log_path}')

if __name__ == '__main__':
    main()
```

주의: 이 1차 버전은 **서울법인 가맹점 정보만** 마이그레이션한다 (전체 22개 시트를 한 스크립트에 다
넣으면 컬럼 인덱스 실수 위험이 매우 크다 — 시트마다 실제 컬럼 순서가 다르므로, 하나를 완전히 검증한
뒤 나머지 시트(경기법인/개인 2개 지역, 차량, 기사)는 같은 패턴으로 하나씩 추가하는 것을 권장한다).
row 인덱스(`row[6]`, `row[7]` 등)는 이 플랜 작성 시점에 확인한 헤더 순서 기준이므로, 실행 전
`openpyxl`로 헤더 행을 다시 한번 출력해 인덱스가 맞는지 확인한다.

- [ ] **Step 2: 헤더 인덱스 재확인 후 실행**

Run:
```bash
cd "C:/Users/SMC/Desktop/케빈의 프로젝트/SMC_CRM/cabsy-crm" && python scripts/migrate_xlsx.py
```
Expected: `완료. 삽입 N건, 스킵 M건.` 출력. `scripts/migrate_log.txt`에 실패 건 기록.

- [ ] **Step 3: 커밋 (스크립트만 — xlsx/로그 파일은 커밋 금지)**

```bash
git add scripts/migrate_xlsx.py
git commit -m "add xlsx migration script (Seoul corporate franchisees)"
```

---

### Task 9: 마이그레이션 실행 안내 + 종단 검증

**Files:** 없음 (검증만 수행)

- [ ] **Step 1: 사용자에게 스키마 마이그레이션 실행 요청**

"`supabase_schema.sql` 내용을 Supabase 대시보드 > SQL Editor에서 실행해주세요." 요청 후 완료 확인을 받는다.

- [ ] **Step 2: 직원 계정 생성**

```bash
cd "C:/Users/SMC/Desktop/케빈의 프로젝트/SMC_CRM/cabsy-crm" && node scripts/create-staff.mjs <아이디> <비밀번호> <이름>
```

사용자에게 실제 로그인할 아이디/비밀번호/이름을 물어보고 실행한다.

- [ ] **Step 3: 데이터 마이그레이션 스크립트 실행 (Task 8)**

- [ ] **Step 4: 로그인 + 검색 + 상세 화면 동작 확인**

Bash로 REST API 직접 쿼리해 franchisees 테이블에 데이터가 들어갔는지 확인:

```bash
cd "C:/Users/SMC/Desktop/케빈의 프로젝트/SMC_CRM/cabsy-crm" && node -e "
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()]}));
const base = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
fetch(base + '/rest/v1/franchisees?select=id,business_name,region,type&limit=5', {
  headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d, null, 2)));
"
```

Expected: 마이그레이션된 가맹점 목록이 보임.

- [ ] **Step 5: 최종 확인**

사용자에게 결과를 요약해서 보고한다 (마이그레이션 건수, 스킵 건수, 로그인 계정 정보, 배포 URL에서
직접 로그인해보도록 안내).
