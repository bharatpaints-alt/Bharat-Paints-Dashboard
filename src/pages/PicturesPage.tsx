import { ImagePlus, Search, X } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '../components/States'
import { ProductPictureManager } from '../components/ProductPictureManager'
import type { StockProduct } from '../types/inventory'
import { searchProducts } from '../utils/inventory'

export function PicturesPage({ products }: { products: StockProduct[] }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')
  const results = query.trim() ? searchProducts(products, query).slice(0, 20) : []

  return <section className="page"><div className="page-title"><p>Drive photo library</p><h1>Product Pictures</h1><span>Choose a product, then add up to three clear photos.</span></div>
    {!selected && <><label className="search-box"><Search size={21} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product to manage" /></label>{results.length > 0 && <div className="picker-list">{results.map((item) => <button key={item.product} onClick={() => setSelected(item.product)}><ImagePlus size={19} /><span>{item.product}</span></button>)}</div>}{!query && <EmptyState title="Select a product" text="Search above to view, take, replace or delete its pictures." />}</>}
    {selected && <><button className="change-product" onClick={() => setSelected('')}><X size={18} /> Change product</button><div className="selected-product"><small>Selected product</small><h2>{selected}</h2></div><ProductPictureManager productName={selected} /></>}
  </section>
}
