import { useCallback, useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { FloatingVoiceButton } from './components/FloatingVoiceButton'
import { ErrorState, LoadingCards } from './components/States'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MorePage } from './pages/MorePage'
import { OrderPage } from './pages/OrderPage'
import { PicturesPage } from './pages/PicturesPage'
import { SearchPage } from './pages/SearchPage'
import { AuthRequiredError, authApi } from './services/authApi'
import { inventoryApi } from './services/inventoryApi'
import type { PageId, StockProduct } from './types/inventory'

export default function App() {
  const [authChecked, setAuthChecked] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [page, setPage] = useState<PageId>('home'); const [products, setProducts] = useState<StockProduct[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [online, setOnline] = useState(navigator.onLine)
  const [pendingVoiceQuery, setPendingVoiceQuery] = useState('')

  useEffect(() => { void authApi.checkSession().then((ok) => { setSignedIn(ok); setAuthChecked(true) }) }, [])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const data = await inventoryApi.getStock(); setProducts(data); sessionStorage.setItem('bp-stock-cache', JSON.stringify(data)) }
    catch (reason) {
      if (reason instanceof AuthRequiredError) { setSignedIn(false); return }
      const cached = sessionStorage.getItem('bp-stock-cache')
      if (cached) setProducts(JSON.parse(cached) as StockProduct[]); else setError(reason instanceof Error ? reason.message : 'Could not load live stock.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!signedIn) return
    void load()
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [signedIn, load])

  if (!authChecked) return <section className="page"><LoadingCards /></section>
  if (!signedIn) return <LoginPage onSignedIn={() => setSignedIn(true)} />

  return <>
    <AppShell page={page} setPage={setPage} online={online}>{error ? <section className="page"><ErrorState message={error} retry={() => void load()} /></section> : <>{page === 'home' && <HomePage products={products} loading={loading} go={setPage} openProduct={(text) => { setPendingVoiceQuery(text); setPage('search') }} />}{page === 'search' && <SearchPage products={products} go={setPage} initialQuery={pendingVoiceQuery} onInitialQueryConsumed={() => setPendingVoiceQuery('')} />}{page === 'order' && <OrderPage products={products} />}{page === 'pictures' && <PicturesPage products={products} />}{page === 'more' && <MorePage onSignedOut={() => { setSignedIn(false); setPage('home') }} />}</>}</AppShell>
    <FloatingVoiceButton hidden={page === 'search'} go={setPage} onProductQuery={(text) => { setPendingVoiceQuery(text); setPage('search') }} />
  </>
}
