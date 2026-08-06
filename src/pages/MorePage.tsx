import { BarChart3, LogOut } from 'lucide-react'
import { useState } from 'react'
import { authApi } from '../services/authApi'

const ANALYTICS_DASHBOARD_URL = 'https://bharat-paints-dashboard.vercel.app'

export function MorePage({ onSignedOut }: { onSignedOut: () => void }) {
  const [busy, setBusy] = useState(false)

  async function logout() {
    if (busy) return
    setBusy(true)
    try { await authApi.logout() } finally { onSignedOut() }
  }

  return (
    <section className="page">
      <div className="page-title">
        <p>Employee Tools</p>
        <h1>More</h1>
        <span>Analytics and account</span>
      </div>
      <div className="quick-actions">
        <button onClick={() => window.open(ANALYTICS_DASHBOARD_URL, '_blank', 'noopener')}>
          <BarChart3 />
          <span><strong>Open Analytics Dashboard</strong><small>Full sales &amp; purchase analytics</small></span>
        </button>
        <button className="danger-action" onClick={() => void logout()} disabled={busy}>
          <LogOut />
          <span><strong>{busy ? 'Signing out…' : 'Logout'}</strong><small>End this session</small></span>
        </button>
      </div>
    </section>
  )
}
