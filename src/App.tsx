import { useCallback, useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { ErrorState } from './components/States'
import { HomePage } from './pages/HomePage'
import { OrderPage } from './pages/OrderPage'
import { PicturesPage } from './pages/PicturesPage'
import { SearchPage } from './pages/SearchPage'
import { inventoryApi } from './services/inventoryApi'
import type { PageId, StockProduct } from './types/inventory'

export default function App() {
  const [page, setPage] = useState<PageId>('home'); const [products, setProducts] = useState<StockProduct[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [online, setOnline] = useState(navigator.onLine); const [pictureProduct, setPictureProduct] = useState('')
  const load = useCallback(async () => { setLoading(true); setError(''); try { const data = await inventoryApi.getStock(); setProducts(data); sessionStorage.setItem('bp-stock-cache', JSON.stringify(data)) } catch (reason) { const cached = sessionStorage.getItem('bp-stock-cache'); if (cached) setProducts(JSON.parse(cached) as StockProduct[]); else setError(reason instanceof Error ? reason.message : 'Could not load live stock.') } finally { setLoading(false) } }, [])
  useEffect(() => { void load(); const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) } }, [load])
  function openPictures(name: string) { setPictureProduct(name); setPage('pictures') }
  return <AppShell page={page} setPage={setPage} online={online}>{error ? <section className="page"><ErrorState message={error} retry={() => void load()} /></section> : <>{page === 'home' && <HomePage products={products} loading={loading} go={setPage} />}{page === 'search' && <SearchPage products={products} openPictures={openPictures} go={setPage} />}{page === 'order' && <OrderPage products={products} />}{page === 'pictures' && <PicturesPage products={products} initialProduct={pictureProduct} clearInitial={() => setPictureProduct('')} />}</>}</AppShell>
}
