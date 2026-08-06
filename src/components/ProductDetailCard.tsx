import { Star, ShoppingCart, X } from 'lucide-react'
import { useState } from 'react'
import type { StockProduct } from '../types/inventory'
import { formatMoney, formatNumber, stockStatus } from '../utils/inventory'
import { isFavourite, toggleFavourite } from '../utils/favourites'
import { ProductPictureManager, type PictureSlot } from './ProductPictureManager'

export function ProductDetailCard({ product, onClose, highlightSlot, onHighlightConsumed }: {
  product: StockProduct
  onClose: () => void
  highlightSlot?: PictureSlot | null
  onHighlightConsumed?: () => void
}) {
  const status = stockStatus(product)
  const [favourite, setFavourite] = useState(() => isFavourite(product.product))

  function toggle() {
    const next = toggleFavourite(product.product)
    setFavourite(next.includes(product.product))
  }

  return (
    <section className={`product-detail status-${status.level}`} aria-label={`${product.product} details`}>
      <div className="product-detail-header">
        <div><span className="brand-pill">{product.brand}</span><h2>{product.product}</h2></div>
        <div className="detail-header-actions">
          <button className={`favourite-toggle${favourite ? ' active' : ''}`} onClick={toggle} aria-pressed={favourite} aria-label={favourite ? 'Remove favourite' : 'Add favourite'}>
            <Star size={20} fill={favourite ? 'currentColor' : 'none'} />
          </button>
          <button className="detail-close" onClick={onClose} aria-label="Close product details"><X size={20} /></button>
        </div>
      </div>

      <div className="detail-status-row">
        <span className={`status-chip large ${status.level}`}>{status.label}</span>
        {product.requiredQty > 0 && <span className="order-badge"><ShoppingCart size={14} /> Order {formatNumber(product.requiredQty)}</span>}
      </div>

      <div className="detail-total"><small>Total Stock</small><strong>{formatNumber(product.total)}</strong></div>

      <div className="detail-grid">
        <div><small>Showroom</small><b>{formatNumber(product.showroom)}</b></div>
        <div><small>Godown 3</small><b>{formatNumber(product.godown3)}</b></div>
        <div><small>Gopal Kunj</small><b>{formatNumber(product.gopalKunj)}</b></div>
        <div><small>Min Qty</small><b>{formatNumber(product.minQty)}</b></div>
        <div><small>Required Qty</small><b>{formatNumber(product.requiredQty)}</b></div>
        <div><small>MRP</small><b>{formatMoney(product.mrp)}</b></div>
        <div><small>Rate</small><b>{formatMoney(product.rate)}</b></div>
      </div>

      <div className="detail-pictures-heading"><h3>Product Pictures</h3></div>
      <ProductPictureManager productName={product.product} highlightSlot={highlightSlot} onHighlightConsumed={onHighlightConsumed} />
    </section>
  )
}
