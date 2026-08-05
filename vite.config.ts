import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Plain `vite dev` never runs Vercel's /api serverless functions, which is why
// local requests to /api/inventory returned 404. This middleware serves the
// same action-routed JSON contract locally by loading api/_inventoryHandler.ts
// through Vite's own SSR transform, so dev and production share one code path.
function inventoryDevApi(): Plugin {
  return {
    name: 'bharat-paints-inventory-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/inventory', async (req, res, next) => {
        if (req.method !== 'POST') { next(); return }
        res.setHeader('content-type', 'application/json')
        res.setHeader('cache-control', 'no-store')
        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const raw = Buffer.concat(chunks).toString('utf8')
          const body = raw ? JSON.parse(raw) : {}
          const action = String((body as { action?: unknown }).action || '')
          const payload = ((body as { payload?: Record<string, unknown> }).payload || {}) as Record<string, unknown>
          const { handleInventoryAction } = await server.ssrLoadModule('/api/_inventoryHandler.ts')
          const result = await handleInventoryAction(action, payload)
          res.statusCode = result.ok ? 200 : result.error.code === 'UNKNOWN_ACTION' ? 400 : 500
          res.end(JSON.stringify(result))
        } catch (error) {
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, data: null, error: { code: 'REQUEST_FAILED', message: error instanceof Error ? error.message : 'Unexpected dev server error.' } }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Loads .env.local's server-only STOCK_CSV_URL / GAS_API_URL / GAS_API_TOKEN
  // into process.env for the dev middleware above. These are not VITE_-prefixed,
  // so Vite never injects them into client code via import.meta.env.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return { plugins: [react(), inventoryDevApi()] }
})
