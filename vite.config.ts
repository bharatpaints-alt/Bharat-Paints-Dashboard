import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

async function readJsonBody(req: import('node:http').IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
}

// Plain `vite dev` never runs Vercel's /api serverless functions, which is why
// local requests to /api/* returned 404. This middleware serves the same
// action-routed JSON contracts locally by loading the api/*.ts handlers
// through Vite's own SSR transform, so dev and production share one code path
// — including the same auth gate in front of every inventory/picture action.
function inventoryDevApi(): Plugin {
  return {
    name: 'bharat-paints-inventory-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/auth/login', async (req, res, next) => {
        if (req.method !== 'POST') { next(); return }
        res.setHeader('content-type', 'application/json')
        res.setHeader('cache-control', 'no-store')
        const auth = await server.ssrLoadModule('/api/_auth.ts')
        const secret = process.env.SESSION_SECRET
        const passwordHash = process.env.EMPLOYEE_PASSWORD_HASH
        if (!secret || !passwordHash) { res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: 'Login is not configured yet.' })); return }
        const body = await readJsonBody(req)
        const submitted = String((body as { password?: unknown }).password || '')
        if (!submitted || !auth.verifyPassword(submitted, passwordHash)) {
          await new Promise((resolve) => setTimeout(resolve, 400))
          res.statusCode = 401
          res.end(JSON.stringify({ ok: false, error: 'Incorrect password.' }))
          return
        }
        res.setHeader('Set-Cookie', auth.sessionCookieHeader(secret))
        res.statusCode = 200
        res.end(JSON.stringify({ ok: true }))
      })

      server.middlewares.use('/api/auth/session', async (req, res, next) => {
        if (req.method !== 'GET') { next(); return }
        res.setHeader('content-type', 'application/json')
        res.setHeader('cache-control', 'no-store')
        const auth = await server.ssrLoadModule('/api/_auth.ts')
        const secret = process.env.SESSION_SECRET
        const cookies = auth.parseCookieHeader(req.headers.cookie)
        const authenticated = Boolean(secret) && auth.isSessionValueValid(cookies[auth.SESSION_COOKIE_NAME], secret)
        res.statusCode = authenticated ? 200 : 401
        res.end(JSON.stringify({ ok: authenticated }))
      })

      server.middlewares.use('/api/auth/logout', async (req, res, next) => {
        if (req.method !== 'POST') { next(); return }
        res.setHeader('content-type', 'application/json')
        res.setHeader('cache-control', 'no-store')
        const auth = await server.ssrLoadModule('/api/_auth.ts')
        res.setHeader('Set-Cookie', auth.clearSessionCookieHeader())
        res.statusCode = 200
        res.end(JSON.stringify({ ok: true }))
      })

      server.middlewares.use('/api/inventory', async (req, res, next) => {
        if (req.method !== 'POST') { next(); return }
        res.setHeader('content-type', 'application/json')
        res.setHeader('cache-control', 'no-store')
        try {
          const auth = await server.ssrLoadModule('/api/_auth.ts')
          const secret = process.env.SESSION_SECRET
          const cookies = auth.parseCookieHeader(req.headers.cookie)
          const authenticated = Boolean(secret) && auth.isSessionValueValid(cookies[auth.SESSION_COOKIE_NAME], secret)
          if (!authenticated) {
            res.statusCode = 401
            res.end(JSON.stringify({ ok: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'Please sign in again.' } }))
            return
          }
          const body = await readJsonBody(req)
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
