import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/States'
import { ProductCard } from '../components/ProductCard'
import type { StockProduct } from '../types/inventory'
import { searchProducts } from '../utils/inventory'

export function SearchPage({ products, openPictures }: { products: StockProduct[]; openPictures: (name: string) => void }) {
  const [input, setInput] = useState(''); const [query, setQuery] = useState('')
  useEffect(() => { const timer = setTimeout(() => setQuery(input), 300); return () => clearTimeout(timer) }, [input])
  const results = useMemo(() => searchProducts(products, query), [products, query])
  return <section className="page"><div className="page-title"><p>Inventory</p><h1>Product Search</h1><span>Search by part of a product name.</span></div><label className="search-box"><Search size={21} /><input autoFocus value={input} onChange={(event) => setInput(event.target.value)} placeholder="e.g. Apex 20 litre" /><button onClick={() => setInput('')} aria-label="Clear">{input ? '×' : ''}</button></label>
    {!query.trim() ? <EmptyState title="Start typing a product name" text="Results show live stock at all three locations." /> : results.length ? <><p className="result-count">Showing {results.length}{results.length === 50 ? '+' : ''} matches</p><div className="product-list">{results.map((product) => <ProductCard key={product.product} product={product} onPictures={openPictures} />)}</div></> : <EmptyState title="No product found" text="Try fewer words or check the spelling." />}
  </section>
}
