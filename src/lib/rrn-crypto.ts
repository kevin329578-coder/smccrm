import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// 주민등록번호 전용 암/복호화. 반드시 서버 전용 코드(API 라우트, 서버 컴포넌트)에서만 import할 것 —
// 'use client' 컴포넌트에서 이 파일을 import하면 안 된다. 키는 DB에 저장하거나 SQL 함수로 넘기지
// 않고, 이 서버 환경변수로만 관리한다 (2026-07-21 보안 검토에서 pgcrypto SQL 함수의 RPC 노출
// 문제가 발견된 뒤 이 방식으로 변경함).
//
// 저장 포맷(bytea): iv(12바이트) || authTag(16바이트) || 암호문

function getKey(): Buffer {
  const b64 = process.env.RRN_ENCRYPTION_KEY
  if (!b64) throw new Error('RRN_ENCRYPTION_KEY 환경변수가 설정되지 않았습니다')
  const key = Buffer.from(b64, 'base64')
  if (key.length !== 32) throw new Error('RRN_ENCRYPTION_KEY는 32바이트(base64) 키여야 합니다')
  return key
}

export function encryptRrn(plain: string): Buffer {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, ciphertext])
}

export function decryptRrn(enc: Buffer): string {
  const iv = enc.subarray(0, 12)
  const authTag = enc.subarray(12, 28)
  const ciphertext = enc.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
