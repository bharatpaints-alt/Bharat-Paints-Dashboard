import type { VercelRequest, VercelResponse } from '@vercel/node'
import { failure, handleInventoryAction } from './_inventoryHandler.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json(failure('METHOD_NOT_ALLOWED', 'Use POST for this endpoint.'))
  const action = String(request.body?.action || '')
  const payload = (request.body?.payload || {}) as Record<string, unknown>
  const result = await handleInventoryAction(action, payload)
  return response.status(result.ok ? 200 : result.error.code === 'UNKNOWN_ACTION' ? 400 : 500).json(result)
}
