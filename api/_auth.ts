import type { VercelRequest } from '@vercel/node'
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'bp_session'
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60 // 12 hours

function isProduction(): boolean {
  return process.env.VERCEL_ENV === 'production'
}

// --- Password hashing (scrypt + random salt). Format: "<saltHex>:<hashHex>". ---
// Kept dependency-free (Node's built-in crypto) so it works identically in the
// serverless function and in scripts/hash-password.mjs without a build step.
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [saltHex, hashHex] = storedHash.split(':')
  if (!saltHex || !hashHex) return false
  try {
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const actual = scryptSync(password, salt, expected.length)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

// --- Signed, stateless session cookie: "<expiryMs>.<hmacSignatureBase64url>". ---
function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createSessionCookieValue(secret: string): string {
  const expiry = String(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)
  return `${expiry}.${sign(expiry, secret)}`
}

export function isSessionValueValid(value: string | undefined, secret: string): boolean {
  if (!value) return false
  const [expiry, signature] = value.split('.')
  if (!expiry || !signature) return false
  const expectedSignature = sign(expiry, secret)
  const a = Buffer.from(signature)
  const b = Buffer.from(expectedSignature)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  const expiryMs = Number(expiry)
  return Number.isFinite(expiryMs) && expiryMs > Date.now()
}

export const SESSION_COOKIE_NAME = COOKIE_NAME

/** Parses a raw `Cookie` request header into a name->value map. */
export function parseCookieHeader(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {}
  if (!header) return result
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    const name = part.slice(0, index).trim()
    if (name) result[name] = decodeURIComponent(part.slice(index + 1).trim())
  }
  return result
}

export function isRequestAuthenticated(request: VercelRequest): boolean {
  const secret = process.env.SESSION_SECRET
  if (!secret) return false
  const cookieValue = request.cookies?.[COOKIE_NAME]
  return isSessionValueValid(cookieValue, secret)
}

export function sessionCookieHeader(secret: string): string {
  const value = createSessionCookieValue(secret)
  const secure = isProduction() ? '; Secure' : ''
  return `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`
}

export function clearSessionCookieHeader(): string {
  const secure = isProduction() ? '; Secure' : ''
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`
}

// --- Best-effort failed-login throttling. In-memory only: resets on cold
// start and is not shared across serverless instances/regions, so it is a
// deterrent, not a guarantee. A flat delay on every failure (see login.ts)
// slows down guessing regardless of whether this memory persisted. ---
const MAX_ATTEMPTS_BEFORE_BLOCK = 5
const BLOCK_DURATION_MS = 5 * 60 * 1000
const failedAttempts = new Map<string, { count: number; blockedUntil: number }>()

export function getClientIp(request: VercelRequest): string {
  const forwarded = request.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return value?.split(',')[0]?.trim() || 'unknown'
}

export function isLoginBlocked(ip: string): boolean {
  const entry = failedAttempts.get(ip)
  return Boolean(entry?.blockedUntil && entry.blockedUntil > Date.now())
}

export function recordLoginFailure(ip: string): void {
  const entry = failedAttempts.get(ip) ?? { count: 0, blockedUntil: 0 }
  entry.count += 1
  if (entry.count >= MAX_ATTEMPTS_BEFORE_BLOCK) {
    entry.blockedUntil = Date.now() + BLOCK_DURATION_MS
    entry.count = 0
  }
  failedAttempts.set(ip, entry)
}

export function recordLoginSuccess(ip: string): void {
  failedAttempts.delete(ip)
}
