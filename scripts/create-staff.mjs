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
