import { Camera, Search, ShoppingCart } from 'lucide-react'
import type { PageId, StockProduct } from '../types/inventory'
import { formatNumber, orderItems } from '../utils/inventory'
import { LoadingCards } from '../components/States'

export function HomePage({ products, loading, go }: { products: StockProduct[]; loading: boolean; go: (page: PageId) => void }) {
  const totals = products.reduce((sum, p) => ({ showroom: sum.showroom + p.showroom, godown3: sum.godown3 + p.godown3, gopal: sum.gopal + p.gopalKunj }), { showroom: 0, godown3: 0, gopal: 0 })
  return <section className="page"><div className="hero"><p>Live inventory</p><h1>Good evening</h1><span>Find stock and product pictures in seconds.</span></div>
    <div className="section-heading"><h2>Today’s stock</h2><small>From the existing Bharat Paints Sheet</small></div>
    {loading ? <LoadingCards /> : <div className="metric-grid"><div><small>Total Products</small><strong>{formatNumber(products.length)}</strong></div><div><small>Showroom</small><strong>{formatNumber(totals.showroom)}</strong></div><div><small>Godown 3</small><strong>{formatNumber(totals.godown3)}</strong></div><div><small>Gopal Kunj</small><strong>{formatNumber(totals.gopal)}</strong></div><div className="attention"><small>Items to Order</small><strong>{formatNumber(orderItems(products).length)}</strong></div></div>}
    <div className="section-heading"><h2>Quick actions</h2></div><div className="quick-actions"><button onClick={() => go('search')}><Search /><span><strong>Search Stock</strong><small>Find any product</small></span></button><button onClick={() => go('order')}><ShoppingCart /><span><strong>Items to Order</strong><small>Required quantity &gt; 0</small></span></button><button onClick={() => go('pictures')}><Camera /><span><strong>Product Pictures</strong><small>View or update photos</small></span></button></div>
  </section>
}
