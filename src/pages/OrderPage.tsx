import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '../components/States'
import { ProductCard } from '../components/ProductCard'
import type { StockProduct } from '../types/inventory'
import { normalizeSearch, orderItems } from '../utils/inventory'

export function OrderPage({ products }: { products: StockProduct[] }) {
  const [query, setQuery] = useState(''); const [brand, setBrand] = useState('')
  const items = useMemo(() => orderItems(products), [products])
  const brands = useMemo(() => [...new Set(items.map((item) => item.brand))].sort(), [items])
  const filtered = items.filter((item) => (!brand || item.brand === brand) && (!query || normalizeSearch(item.product).includes(normalizeSearch(query))))
  return <section className="page"><div className="page-title"><p>Replenishment</p><h1>Items to Order</h1><span>Only products where Required Quantity is greater than zero.</span></div><div className="filter-row"><label className="search-box compact"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order list" /></label><select value={brand} onChange={(event) => setBrand(event.target.value)} aria-label="Filter by brand"><option value="">All brands</option>{brands.map((value) => <option key={value}>{value}</option>)}</select></div><p className="result-count">{filtered.length} of {items.length} items</p>{filtered.length ? <div className="product-list">{filtered.map((product) => <ProductCard key={product.product} product={product} orderMode />)}</div> : <EmptyState title="No order items found" text="Change the search or brand filter." />}</section>
}
