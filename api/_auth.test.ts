import { describe, expect, it } from 'vitest'
import {
  createSessionCookieValue, getClientIp, hashPassword, isLoginBlocked, isSessionValueValid,
  parseCookieHeader, recordLoginFailure, recordLoginSuccess, verifyPassword,
} from './_auth.js'

describe('password hashing', () => {
  it('verifies the correct password against its own hash', () => {
    const hash = hashPassword('correct-horse-battery-staple')
    expect(verifyPassword('correct-horse-battery-staple', hash)).toBe(true)
  })
  it('rejects an incorrect password', () => {
    const hash = hashPassword('correct-horse-battery-staple')
    expect(verifyPassword('wrong-password', hash)).toBe(false)
  })
  it('produces a different hash each time (random salt)', () => {
    expect(hashPassword('same-password')).not.toBe(hashPassword('same-password'))
  })
  it('rejects a malformed stored hash instead of throwing', () => {
    expect(verifyPassword('anything', 'not-a-valid-hash')).toBe(false)
  })
})

describe('signed session cookie', () => {
  const secret = 'test-session-secret'

  it('accepts a freshly created cookie value', () => {
    expect(isSessionValueValid(createSessionCookieValue(secret), secret)).toBe(true)
  })
  it('rejects a value signed with a different secret', () => {
    const value = createSessionCookieValue('other-secret')
    expect(isSessionValueValid(value, secret)).toBe(false)
  })
  it('rejects a tampered payload', () => {
    const [, signature] = createSessionCookieValue(secret).split('.')
    const tampered = `${Date.now() + 999999999}.${signature}`
    expect(isSessionValueValid(tampered, secret)).toBe(false)
  })
  it('rejects an expired session', () => {
    const expired = `${Date.now() - 1000}.forged-signature`
    expect(isSessionValueValid(expired, secret)).toBe(false)
  })
  it('rejects undefined/empty values', () => {
    expect(isSessionValueValid(undefined, secret)).toBe(false)
    expect(isSessionValueValid('', secret)).toBe(false)
  })
})

describe('parseCookieHeader', () => {
  it('parses multiple cookies including the session cookie', () => {
    expect(parseCookieHeader('bp_session=abc.def; other=1')).toEqual({ bp_session: 'abc.def', other: '1' })
  })
  it('returns an empty object for a missing header', () => {
    expect(parseCookieHeader(undefined)).toEqual({})
  })
})

describe('login rate limiting', () => {
  it('blocks an IP after 5 failed attempts and unblocks after success', () => {
    const ip = `test-ip-${Math.random()}`
    expect(isLoginBlocked(ip)).toBe(false)
    for (let i = 0; i < 5; i += 1) recordLoginFailure(ip)
    expect(isLoginBlocked(ip)).toBe(true)
  })
  it('does not block a fresh, never-seen IP', () => {
    expect(isLoginBlocked(`unseen-ip-${Math.random()}`)).toBe(false)
  })
  it('resets tracking on a successful login', () => {
    const ip = `test-ip-${Math.random()}`
    recordLoginFailure(ip); recordLoginFailure(ip)
    recordLoginSuccess(ip)
    for (let i = 0; i < 4; i += 1) recordLoginFailure(ip) // below the 5-failure threshold post-reset
    expect(isLoginBlocked(ip)).toBe(false)
  })
})

describe('getClientIp', () => {
  it('reads the first address from x-forwarded-for', () => {
    const ip = getClientIp({ headers: { 'x-forwarded-for': '203.0.113.5, 70.41.3.18' } } as never)
    expect(ip).toBe('203.0.113.5')
  })
  it('falls back to "unknown" when absent', () => {
    expect(getClientIp({ headers: {} } as never)).toBe('unknown')
  })
})
