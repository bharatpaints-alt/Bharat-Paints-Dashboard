import { Boxes, Home, Images, Menu, Search, ShoppingCart } from 'lucide-react'
import type { PageId } from '../types/inventory'

const nav: { id: PageId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home }, { id: 'search', label: 'Search', icon: Search },
  { id: 'order', label: 'Order', icon: ShoppingCart }, { id: 'pictures', label: 'Pictures', icon: Images },
  { id: 'more', label: 'More', icon: Menu },
]

export function AppShell({ page, setPage, children, online }: { page: PageId; setPage: (page: PageId) => void; children: React.ReactNode; online: boolean }) {
  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setPage('home')} aria-label="Go home"><span className="brand-mark">BP</span><span><strong>Bharat Paints</strong><small>Employee Stock</small></span></button>
      <span className={`status ${online ? '' : 'offline'}`}><i />{online ? 'Live' : 'Offline'}</span>
    </header>
    <aside className="desktop-nav"><div className="desktop-title"><Boxes size={20} /> Stock App</div>{nav.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><Icon size={20} />{label}</button>)}</aside>
    <main>{children}</main>
    <nav className="bottom-nav" aria-label="Primary navigation">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)} aria-current={page === id ? 'page' : undefined}><Icon size={21} /><span>{label}</span></button>)}</nav>
  </div>
}
