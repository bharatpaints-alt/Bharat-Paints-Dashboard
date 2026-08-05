import { Camera, ShoppingCart } from 'lucide-react'
import type { StockProduct } from '../types/inventory'
import { formatMoney, formatNumber } from '../utils/inventory'

export function ProductCard({ product, onPictures, orderMode = false }: { product: StockProduct; onPictures?: (name: string) => void; orderMode?: boolean }) {
  return <article className="product-card">
    <div className="product-heading"><div><span className="brand-pill">{product.brand}</span><h3>{product.product}</h3></div>{product.requiredQty > 0 && <span className="order-badge"><ShoppingCart size={14} /> Order {formatNumber(product.requiredQty)}</span>}</div>
    {!orderMode && <div className="prices"><span><small>MRP</small>{formatMoney(product.mrp)}</span><span><small>Rate</small>{formatMoney(product.rate)}</span></div>}
    <div className="stock-grid">
      <span><small>Showroom</small><b>{formatNumber(product.showroom)}</b></span><span><small>Godown 3</small><b>{formatNumber(product.godown3)}</b></span><span><small>Gopal Kunj</small><b>{formatNumber(product.gopalKunj)}</b></span><span className="total"><small>Total</small><b>{formatNumber(product.total)}</b></span>
    </div>
    <div className="product-footer"><span>Min: <b>{formatNumber(product.minQty)}</b> · Required: <b>{formatNumber(product.requiredQty)}</b></span>{onPictures && <button className="text-button" onClick={() => onPictures(product.product)}><Camera size={17} /> Pictures</button>}</div>
  </article>
}
