import { Camera, Search, ShoppingCart, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PageId, StockProduct } from '../types/inventory'
import { EmptyState, LoadingCards } from '../components/States'
import { clearRecentProducts, getRecentProducts } from '../utils/recentProducts'
import { getFavourites } from '../utils/favourites'

export function HomePage({ products, loading, go, openProduct }: {
  products: StockProduct[]
  loading: boolean
  go: (page: PageId) => void
  /** Opens a product directly on Search, reusing the same hand-off as voice search. */
  openProduct: (productName: string) => void
}) {
  const [favourites, setFavourites] = useState<string[]>([])
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => { setFavourites(getFavourites()); setRecent(getRecentProducts()) }, [])

  const favouriteProducts = favourites.map((name) => products.find((p) => p.product === name)).filter((p): p is StockProduct => Boolean(p))
  const recentProducts = recent.map((name) => products.find((p) => p.product === name)).filter((p): p is StockProduct => Boolean(p))

  return (
    <section className="page">
      <div className="hero"><p>Live inventory</p><h1>Bharat Paints Employee Tools</h1><span>Find stock and product pictures in seconds.</span></div>

      <div className="section-heading"><h2>Quick actions</h2></div>
      {loading ? <LoadingCards /> : (
        <div className="quick-actions">
          <button onClick={() => go('search')}><Search /><span><strong>Search Product</strong><small>Find any product</small></span></button>
          <button onClick={() => go('order')}><ShoppingCart /><span><strong>Order Items</strong><small>Required quantity &gt; 0</small></span></button>
          <button onClick={() => go('pictures')}><Camera /><span><strong>Pictures</strong><small>View or update photos</small></span></button>
        </div>
      )}

      <div className="section-heading"><h2>Favourite Products</h2></div>
      {favouriteProducts.length ? (
        <div className="quick-actions">
          {favouriteProducts.map((product) => (
            <button key={product.product} onClick={() => openProduct(product.product)}>
              <Star fill="currentColor" />
              <span><strong>{product.product}</strong><small>{product.brand}</small></span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="No favourites yet" text="Tap the star on any product to add it here." />
      )}

      <div className="section-heading"><h2>Recently Viewed</h2></div>
      {recentProducts.length ? (
        <div className="recent-products">
          <div className="recent-products-list">
            {recentProducts.map((product) => (
              <button key={product.product} type="button" className="recent-product-chip" onClick={() => openProduct(product.product)}>{product.product}</button>
            ))}
          </div>
          <button type="button" className="text-button" onClick={() => setRecent(clearRecentProducts())}>Clear Recent</button>
        </div>
      ) : (
        <EmptyState title="Nothing viewed yet" text="Products you search or open will show up here." />
      )}
    </section>
  )
}
