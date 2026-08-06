import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isRequestAuthenticated } from '../_auth.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'GET') return response.status(405).json({ ok: false, error: 'Use GET for this endpoint.' })
  if (!isRequestAuthenticated(request)) return response.status(401).json({ ok: false, error: 'Not signed in.' })
  return response.status(200).json({ ok: true })
}
