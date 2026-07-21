import { createClient } from '@supabase/supabase-js'

// service-role 키를 쓰는 서버 전용 클라이언트. RLS를 우회하므로 서버 컴포넌트/API 라우트에서만 사용할 것.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
