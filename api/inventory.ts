import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isRequestAuthenticated } from './_auth.js'
import { failure, handleInventoryAction } from './_inventoryHandler.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') return response.status(405).json(failure('METHOD_NOT_ALLOWED', 'Use POST for this endpoint.'))
  // Every action here (stock, picture metadata, upload, delete, settings) is
  // private — refused server-side before any Sheet/Apps Script call is made,
  // so bypassing the React login screen alone can never reach real data.
  if (!isRequestAuthenticated(request)) return response.status(401).json(failure('UNAUTHENTICATED', 'Please sign in again.'))
  const action = String(request.body?.action || '')
  const payload = (request.body?.payload || {}) as Record<string, unknown>
  const result = await handleInventoryAction(action, payload)
  return response.status(result.ok ? 200 : result.error.code === 'UNKNOWN_ACTION' ? 400 : 500).json(result)
}
