import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientIp, isLoginBlocked, recordLoginFailure, recordLoginSuccess, sessionCookieHeader, verifyPassword } from '../_auth.js'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json({ ok: false, error: 'Use POST for this endpoint.' })

  const secret = process.env.SESSION_SECRET
  const passwordHash = process.env.EMPLOYEE_PASSWORD_HASH
  if (!secret || !passwordHash) return response.status(500).json({ ok: false, error: 'Login is not configured yet.' })

  const ip = getClientIp(request)
  if (isLoginBlocked(ip)) {
    await delay(400)
    return response.status(429).json({ ok: false, error: 'Too many attempts. Please try again in a few minutes.' })
  }

  const submitted = String((request.body as { password?: unknown })?.password || '')
  const valid = submitted.length > 0 && verifyPassword(submitted, passwordHash)

  if (!valid) {
    recordLoginFailure(ip)
    await delay(400) // flat delay slows down guessing even if in-memory tracking resets
    return response.status(401).json({ ok: false, error: 'Incorrect password.' })
  }

  recordLoginSuccess(ip)
  response.setHeader('Set-Cookie', sessionCookieHeader(secret))
  return response.status(200).json({ ok: true })
}
