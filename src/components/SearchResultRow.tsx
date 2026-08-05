import { ShoppingCart } from 'lucide-react'
import type { StockProduct } from '../types/inventory'
import { formatNumber, stockStatus } from '../utils/inventory'

/** Compact, tappable row for the search results list — expands a ProductDetailCard on tap. */
export function SearchResultRow({ product, best, selected, onSelect }: { product: StockProduct; best?: boolean; selected?: boolean; onSelect: () => void }) {
  const status = stockStatus(product)
  return (
    <button type="button" className={`result-row${best ? ' best' : ''}${selected ? ' selected' : ''}`} onClick={onSelect} aria-expanded={selected}>
      <div className="result-row-main">
        {best && <span className="best-match-label">Best Match</span>}
        <span className="brand-pill">{product.brand}</span>
        <h3>{product.product}</h3>
      </div>
      <div className="result-row-meta">
        <span className={`status-chip ${status.level}`}>{status.label}</span>
        {product.requiredQty > 0 && <span className="order-badge"><ShoppingCart size={13} /> Order {formatNumber(product.requiredQty)}</span>}
      </div>
    </button>
  )
}
