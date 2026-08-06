export class AuthRequiredError extends Error {
  constructor() { super('Not signed in.') }
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: string }
    return body.error || `Request failed (HTTP ${response.status}).`
  } catch {
    return `Request failed (HTTP ${response.status}).`
  }
}

export const authApi = {
  /** Resolves true if a valid session cookie is present, false if not (never throws for a plain 401). */
  async checkSession(): Promise<boolean> {
    const response = await fetch('/api/auth/session', { method: 'GET' })
    return response.ok
  },

  async login(password: string): Promise<void> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!response.ok) throw new Error(await readError(response))
  },

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' })
  },
}
