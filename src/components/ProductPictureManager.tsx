import { Camera, ChevronLeft, ChevronRight, Share2, Upload, Trash2, X, ZoomIn } from 'lucide-react'
import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { inventoryApi } from '../services/inventoryApi'
import type { ProductImages } from '../types/inventory'
import { compressProductImage } from '../utils/image'

const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

// Shares the exact optimised image already shown in the viewer — never a
// separate original — so WhatsApp/etc. always send the ≤100KB WebP asset.
async function shareImage(dataUrl: string, title: string) {
  try {
    const blob = await (await fetch(dataUrl)).blob()
    const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg'
    const file = new File([blob], `${title}.${extension}`, { type: blob.type })
    if (navigator.canShare && !navigator.canShare({ files: [file] })) return
    await navigator.share({ files: [file], title })
  } catch { /* user cancelled or share unavailable — sharing is optional, never an error */ }
}

export type PictureSlot = 1 | 2 | 3

// Employee-facing labels only — the backend slot numbers (1/2/3) and the
// Product_Images sheet columns they map to are unchanged.
export const SLOT_LABELS: Record<PictureSlot, string> = { 1: 'Front', 2: 'Back', 3: 'Side / Additional' }
const SLOTS: PictureSlot[] = [1, 2, 3]

const emptyImages = (product: string): ProductImages => ({ product, slot1: { fileId: '', url: '' }, slot2: { fileId: '', url: '' }, slot3: { fileId: '', url: '' }, updatedAt: '', updatedBy: '' })

/**
 * Shared picture view/upload/replace/delete UI + state for one product.
 * Used by the standalone Pictures page and inline from the Search product
 * detail card — both talk to the exact same inventoryApi picture actions.
 */
export function ProductPictureManager({ productName, highlightSlot, onHighlightConsumed }: { productName: string; highlightSlot?: PictureSlot | null; onHighlightConsumed?: () => void }) {
  const [images, setImages] = useState<ProductImages | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [viewer, setViewer] = useState('')
  const [targetSlot, setTargetSlot] = useState<PictureSlot>(1)
  const [activeSlot, setActiveSlot] = useState<PictureSlot>(1)
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const touchStartX = useRef<number | null>(null)

  // A highlighted slot (voice "take front/back/side photo") also swipes the
  // carousel to that slot so the tip and the button are visible together.
  useEffect(() => { if (highlightSlot) setActiveSlot(highlightSlot) }, [highlightSlot])

  async function load() {
    setBusy(true); setNotice(null); setImages(emptyImages(productName))
    try {
      const result = await inventoryApi.getProductImages(productName)
      const loaded = { ...result }
      for (const slot of SLOTS) {
        const key = `slot${slot}` as const
        if (loaded[key]?.fileId) {
          try { const data = await inventoryApi.getProductImageData(loaded[key].fileId); loaded[key] = { ...loaded[key], dataUrl: data.dataUrl || data.fallbackUrl } }
          catch { /* keep metadata and show the empty-preview fallback */ }
        }
      }
      setImages(loaded)
    } catch (error) { setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Could not load pictures.' }) }
    finally { setBusy(false) }
  }

  useEffect(() => { void load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [productName])

  function resetFileInputs() {
    if (galleryRef.current) galleryRef.current.value = ''
    if (cameraRef.current) cameraRef.current.value = ''
  }

  async function upload(file?: File) {
    if (!file) return
    if (!navigator.onLine) { setNotice({ type: 'error', text: "You're offline. Connect to the internet and try again." }); resetFileInputs(); return }
    const hasImage = Boolean(images?.[`slot${targetSlot}`]?.fileId)
    if (hasImage && !window.confirm(`Replace the ${SLOT_LABELS[targetSlot]} picture?`)) { resetFileInputs(); return }
    setBusy(true); setNotice(null)
    try {
      const compressed = await compressProductImage(file)
      setNotice({ type: 'success', text: `Uploading ${(compressed.bytes / 1024).toFixed(0)} KB picture…` })
      const result = await inventoryApi.uploadProductImage({ productName, slot: targetSlot, base64: compressed.base64, mimeType: compressed.mimeType, fileName: compressed.fileName })
      let dataUrl = ''
      try { const data = await inventoryApi.getProductImageData(result.fileId); dataUrl = data.dataUrl || data.fallbackUrl } catch { /* metadata still saved; preview falls back to placeholder */ }
      // Refresh only the affected slot — no full reload of the product or the app.
      setImages((prev) => prev ? { ...prev, [`slot${targetSlot}`]: { fileId: result.fileId, url: result.url, dataUrl } } : prev)
      setNotice({ type: 'success', text: `${SLOT_LABELS[targetSlot]} picture saved.` })
    } catch (error) {
      // The slot's previous image is untouched in state — replacement failure never loses the old photo.
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Upload failed. Please try again.' })
    } finally { setBusy(false); resetFileInputs() }
  }

  async function remove(slot: PictureSlot) {
    if (!window.confirm(`Delete the ${SLOT_LABELS[slot]} picture? This cannot be undone.`)) return
    if (!navigator.onLine) { setNotice({ type: 'error', text: "You're offline. Connect to the internet and try again." }); return }
    setBusy(true); setNotice(null)
    try {
      await inventoryApi.deleteProductImage(productName, slot)
      setImages((prev) => prev ? { ...prev, [`slot${slot}`]: { fileId: '', url: '' } } : prev)
      setNotice({ type: 'success', text: `${SLOT_LABELS[slot]} picture deleted.` })
    } catch (error) { setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Delete failed. Please try again.' }) }
    finally { setBusy(false) }
  }

  function choose(slot: PictureSlot, camera: boolean) {
    setTargetSlot(slot)
    onHighlightConsumed?.()
    window.setTimeout(() => (camera ? cameraRef.current : galleryRef.current)?.click(), 0)
  }

  function prevSlot() { setActiveSlot((slot) => (slot === 1 ? 3 : ((slot - 1) as PictureSlot))) }
  function nextSlot() { setActiveSlot((slot) => (slot === 3 ? 1 : ((slot + 1) as PictureSlot))) }

  function onTouchStart(event: TouchEvent) { touchStartX.current = event.touches[0]?.clientX ?? null }
  function onTouchEnd(event: TouchEvent) {
    if (touchStartX.current === null) return
    const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 40) return // ignore taps/small jitter, only real swipes navigate
    if (delta < 0) nextSlot(); else prevSlot()
  }

  const activeImage = images?.[`slot${activeSlot}`]
  const activeHasImage = Boolean(activeImage?.fileId)
  const activeEmptyResponse = activeHasImage && images !== null && !busy && activeImage?.dataUrl === ''
  const activeHighlighted = highlightSlot === activeSlot

  return (
    <div className="picture-manager">
      {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}

      <div className="picture-carousel">
        <button type="button" className="carousel-arrow" onClick={prevSlot} aria-label="Previous picture"><ChevronLeft /></button>
        <div className="picture-card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className={`picture-preview large${activeHighlighted ? ' highlighted' : ''}`}>
            {activeImage?.dataUrl ? (
              <button onClick={() => setViewer(activeImage.dataUrl!)} aria-label={`View ${SLOT_LABELS[activeSlot]} picture`}>
                <img src={activeImage.dataUrl} alt={`${productName} — ${SLOT_LABELS[activeSlot]}`} />
                <ZoomIn />
              </button>
            ) : (
              <div><Camera /><span>{busy ? 'Loading…' : activeEmptyResponse ? 'Picture unavailable' : SLOT_LABELS[activeSlot]}</span></div>
            )}
          </div>
        </div>
        <button type="button" className="carousel-arrow" onClick={nextSlot} aria-label="Next picture"><ChevronRight /></button>
      </div>

      <div className="picture-dots" role="tablist" aria-label="Picture slot">
        {SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            role="tab"
            className={`picture-dot${slot === activeSlot ? ' active' : ''}`}
            aria-selected={slot === activeSlot}
            onClick={() => setActiveSlot(slot)}
          >
            {SLOT_LABELS[slot].split(' ')[0]}
          </button>
        ))}
      </div>

      {activeHighlighted && <p className="picture-highlight-tip">Tap here to open the camera.</p>}

      <div className="picture-actions">
        <button className="primary" disabled={busy} onClick={() => choose(activeSlot, true)}><Camera size={18} /> {activeHasImage ? 'Retake' : 'Take Photo'}</button>
        <button disabled={busy} onClick={() => choose(activeSlot, false)}><Upload size={18} /> {activeHasImage ? 'Replace' : 'Choose Gallery'}</button>
        {activeHasImage && <button className="danger" disabled={busy} onClick={() => void remove(activeSlot)}><Trash2 size={18} /> Delete</button>}
      </div>

      <input ref={cameraRef} hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => void upload(e.target.files?.[0])} />
      <input ref={galleryRef} hidden type="file" accept="image/jpeg,image/png,image/webp,.heic,.heif" onChange={(e) => void upload(e.target.files?.[0])} />
      {viewer && (
        <div className="viewer" role="dialog" aria-modal="true">
          <button onClick={() => setViewer('')} aria-label="Close"><X /></button>
          {canShareFiles && (
            <button className="viewer-share" onClick={() => void shareImage(viewer, `${productName} - ${SLOT_LABELS[activeSlot]}`)} aria-label="Share picture">
              <Share2 />
            </button>
          )}
          <img src={viewer} alt="Full-screen product" />
        </div>
      )}
    </div>
  )
}
