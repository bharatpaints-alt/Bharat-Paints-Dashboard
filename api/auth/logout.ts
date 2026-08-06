import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clearSessionCookieHeader } from '../_auth.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json({ ok: false, error: 'Use POST for this endpoint.' })
  response.setHeader('Set-Cookie', clearSessionCookieHeader())
  return response.status(200).json({ ok: true })
}
