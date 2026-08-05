import { Camera, ImagePlus, Search, Trash2, Upload, X, ZoomIn } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { EmptyState } from '../components/States'
import { inventoryApi } from '../services/inventoryApi'
import type { ProductImages, StockProduct } from '../types/inventory'
import { compressProductImage } from '../utils/image'
import { searchProducts } from '../utils/inventory'

const emptyImages = (product: string): ProductImages => ({ product, slot1: { fileId: '', url: '' }, slot2: { fileId: '', url: '' }, slot3: { fileId: '', url: '' }, updatedAt: '', updatedBy: '' })

export function PicturesPage({ products, initialProduct, clearInitial }: { products: StockProduct[]; initialProduct: string; clearInitial: () => void }) {
  const [query, setQuery] = useState(''); const [selected, setSelected] = useState(''); const [images, setImages] = useState<ProductImages | null>(null)
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null); const [viewer, setViewer] = useState('')
  const [targetSlot, setTargetSlot] = useState(1); const galleryRef = useRef<HTMLInputElement>(null); const cameraRef = useRef<HTMLInputElement>(null)
  const results = query.trim() ? searchProducts(products, query).slice(0, 20) : []

  async function selectProduct(name: string) {
    setSelected(name); setQuery(''); setNotice(null); setBusy(true); setImages(emptyImages(name))
    try {
      const result = await inventoryApi.getProductImages(name)
      const loaded = { ...result }
      for (const key of ['slot1', 'slot2', 'slot3'] as const) {
        if (loaded[key]?.fileId) {
          try { const data = await inventoryApi.getProductImageData(loaded[key].fileId); loaded[key] = { ...loaded[key], dataUrl: data.dataUrl || data.fallbackUrl } } catch { /* keep metadata and show empty fallback */ }
        }
      }
      setImages(loaded)
    } catch (error) { setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Could not load pictures.' }) }
    finally { setBusy(false); clearInitial() }
  }

  useEffect(() => { if (initialProduct && initialProduct !== selected) void selectProduct(initialProduct) }, [initialProduct])

  async function upload(file?: File) {
    if (!file || !selected) return
    setBusy(true); setNotice(null)
    try {
      const compressed = await compressProductImage(file)
      setNotice({ type: 'success', text: `Uploading ${(compressed.bytes / 1024).toFixed(0)} KB picture…` })
      await inventoryApi.uploadProductImage({ productName: selected, slot: targetSlot, base64: compressed.base64, mimeType: compressed.mimeType, fileName: compressed.fileName })
      setNotice({ type: 'success', text: `Picture ${targetSlot} saved successfully.` })
      await selectProduct(selected)
    } catch (error) { setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Upload failed.' }) }
    finally { setBusy(false); if (galleryRef.current) galleryRef.current.value = ''; if (cameraRef.current) cameraRef.current.value = '' }
  }

  async function remove(slot: number) {
    if (!selected || !window.confirm(`Delete Picture ${slot}?`)) return
    setBusy(true); setNotice(null)
    try { await inventoryApi.deleteProductImage(selected, slot); setNotice({ type: 'success', text: `Picture ${slot} deleted.` }); await selectProduct(selected) }
    catch (error) { setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Delete failed.' }) }
    finally { setBusy(false) }
  }

  function choose(slot: number, camera: boolean) { setTargetSlot(slot); window.setTimeout(() => (camera ? cameraRef.current : galleryRef.current)?.click(), 0) }

  return <section className="page"><div className="page-title"><p>Drive photo library</p><h1>Product Pictures</h1><span>Choose a product, then add up to three clear photos.</span></div>
    {!selected && <><label className="search-box"><Search size={21} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product to manage" /></label>{results.length > 0 && <div className="picker-list">{results.map((item) => <button key={item.product} onClick={() => void selectProduct(item.product)}><ImagePlus size={19} /><span>{item.product}</span></button>)}</div>}{!query && <EmptyState title="Select a product" text="Search above to view, take, replace or delete its pictures." />}</>}
    {selected && <><button className="change-product" onClick={() => { setSelected(''); setImages(null) }}><X size={18} /> Change product</button><div className="selected-product"><small>Selected product</small><h2>{selected}</h2></div>{notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}<div className="picture-grid">{([1,2,3] as const).map((slot) => { const image = images?.[`slot${slot}`]; const hasImage = Boolean(image?.fileId); return <article className="picture-slot" key={slot}><div className="picture-preview">{image?.dataUrl ? <button onClick={() => setViewer(image.dataUrl!)} aria-label={`View Picture ${slot}`}><img src={image.dataUrl} alt={`${selected} picture ${slot}`} /><ZoomIn /></button> : <div><Camera /><span>{busy ? 'Loading…' : `Picture ${slot}`}</span></div>}</div><strong>Picture {slot}</strong><div className="picture-actions"><button disabled={busy} onClick={() => choose(slot, true)}><Camera size={18} /> {hasImage ? 'Retake' : 'Take Photo'}</button><button disabled={busy} onClick={() => choose(slot, false)}><Upload size={18} /> {hasImage ? 'Replace' : 'Gallery'}</button>{hasImage && <button className="danger" disabled={busy} onClick={() => void remove(slot)}><Trash2 size={18} /> Delete</button>}</div></article> })}</div></>}
    <input ref={cameraRef} hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => void upload(e.target.files?.[0])} /><input ref={galleryRef} hidden type="file" accept="image/jpeg,image/png,image/webp,.heic,.heif" onChange={(e) => void upload(e.target.files?.[0])} />
    {viewer && <div className="viewer" role="dialog" aria-modal="true"><button onClick={() => setViewer('')} aria-label="Close"><X /></button><img src={viewer} alt="Full-screen product" /></div>}
  </section>
}
