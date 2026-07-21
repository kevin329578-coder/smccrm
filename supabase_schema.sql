-- Cabsy CRM 스키마
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.

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

-- 주민등록번호(resident_reg_no_enc) 암/복호화는 DB 함수로 만들지 않는다.
-- Supabase는 public 스키마의 함수를 기본적으로 PostgREST RPC로 노출하므로, 키를 파라미터로
--받는 SQL 함수를 만들면 로그인한 클라이언트가 그 RPC를 직접 호출해 임의의 키로 복호화를
-- 시도할 수 있게 된다. 대신 암/복호화는 서버 전용 애플리케이션 코드(Node crypto, AES-256-GCM)에서
-- 처리하고, 키는 서버 환경변수(.env.local, NEXT_PUBLIC_ 아님)로만 관리한다 — 개인 상세 정보
-- 입력/조회 화면을 만드는 태스크에서 함께 구현한다.

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
