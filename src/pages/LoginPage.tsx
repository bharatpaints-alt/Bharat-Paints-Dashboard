import { Lock } from 'lucide-react'
import { useState } from 'react'
import { authApi } from '../services/authApi'

export function LoginPage({ onSignedIn }: { onSignedIn: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!password || busy) return
    setBusy(true); setError('')
    try {
      await authApi.login(password)
      setPassword('')
      onSignedIn()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={(event) => void submit(event)}>
        <span className="brand-mark large">BP</span>
        <h1>Bharat Paints</h1>
        <p>Employee Tools — sign in to continue</p>
        <label className="search-box">
          <Lock size={20} />
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Employee password"
            autoComplete="current-password"
          />
        </label>
        {error && <div className="notice error">{error}</div>}
        <button type="submit" className="primary-button login-submit" disabled={busy || !password}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
