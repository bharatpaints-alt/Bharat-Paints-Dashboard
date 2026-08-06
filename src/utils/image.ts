const SUPPORTED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

const MAX_SIDE = 1000
const MIN_SIDE = 400 // never shrink below this — keeps container/label text legible
const TARGET_BYTES = 100 * 1024
const QUALITY_START = 0.75
const QUALITY_FLOOR = 0.35
const QUALITY_STEP = 0.08
const DIMENSION_SHRINK = 0.85
const MAX_DIMENSION_ROUNDS = 4
// Last-resort ceiling: if even the smallest/lowest-quality attempt exceeds
// this, the source photo is unusually complex — ask for a different one
// rather than silently shipping something far outside the size budget.
const HARD_CEILING_BYTES = 200 * 1024

export type ImageMimeType = 'image/webp' | 'image/jpeg'
export type CompressedImage = { base64: string; mimeType: ImageMimeType; fileName: string; bytes: number; previewUrl: string }
export type EncodedResult = { dataUrl: string; bytes: number }
export type EncodeFn = (width: number, height: number, quality: number) => EncodedResult

function scaledDimensions(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height)) // never upscale
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/**
 * Pure compression-planning loop, independent of the DOM/canvas so it can be
 * unit-tested with a fake encoder. Reduces quality first (down to a floor
 * that keeps labels readable), then reduces dimensions (down to MIN_SIDE)
 * only if quality reduction alone can't reach the target, and stops the
 * instant the target is met — never compresses further than necessary.
 */
export function planCompression(naturalWidth: number, naturalHeight: number, encode: EncodeFn): EncodedResult {
  let dims = scaledDimensions(naturalWidth, naturalHeight, MAX_SIDE)
  let best: EncodedResult | null = null

  for (let round = 0; round < MAX_DIMENSION_ROUNDS; round += 1) {
    let quality = QUALITY_START
    let attempt = encode(dims.width, dims.height, quality)
    while (attempt.bytes > TARGET_BYTES && quality > QUALITY_FLOOR) {
      quality = Math.max(QUALITY_FLOOR, quality - QUALITY_STEP)
      attempt = encode(dims.width, dims.height, quality)
    }
    best = attempt
    if (attempt.bytes <= TARGET_BYTES) break
    if (Math.max(dims.width, dims.height) <= MIN_SIDE) break // can't shrink further — accept best effort
    dims = scaledDimensions(dims.width, dims.height, Math.max(MIN_SIDE, Math.round(Math.max(dims.width, dims.height) * DIMENSION_SHRINK)))
  }

  return best as EncodedResult
}

let webpSupportCache: boolean | null = null
function supportsWebPEncoding(): boolean {
  if (webpSupportCache !== null) return webpSupportCache
  const canvas = document.createElement('canvas')
  canvas.width = 1; canvas.height = 1
  webpSupportCache = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  return webpSupportCache
}

function dataUrlBytes(dataUrl: string): number {
  return Math.floor((dataUrl.split(',')[1] ?? '').length * 0.75)
}

/**
 * Converts an uploaded photo into a single optimised image: WebP where the
 * browser supports encoding it (JPEG otherwise), longest side capped at
 * 1000px, quality/dimensions automatically reduced until the file is
 * ≤100KB. No thumbnails, no original kept — this is the only asset that
 * gets uploaded and stored.
 */
export async function compressProductImage(file: File): Promise<CompressedImage> {
  const type = file.type.toLowerCase()
  if (type.includes('heic') || type.includes('heif') || /\.hei[cf]$/i.test(file.name)) throw new Error('HEIC/HEIF is not supported. On iPhone choose Camera > Formats > Most Compatible, or select a JPG/PNG photo.')
  if (!SUPPORTED.has(type)) throw new Error('Please choose a JPG, JPEG, PNG or WEBP picture.')
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('This picture could not be read. Please choose another image.'))
      element.src = objectUrl
    })

    const mimeType: ImageMimeType = supportsWebPEncoding() ? 'image/webp' : 'image/jpeg'
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Picture processing is unavailable in this browser.')

    const encode: EncodeFn = (width, height, quality) => {
      canvas.width = width; canvas.height = height
      context.fillStyle = '#fff'
      context.fillRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)
      const dataUrl = canvas.toDataURL(mimeType, quality)
      return { dataUrl, bytes: dataUrlBytes(dataUrl) }
    }

    const result = planCompression(image.naturalWidth, image.naturalHeight, encode)
    if (result.bytes > HARD_CEILING_BYTES) throw new Error('This picture is too complex to compress small enough. Please try a different photo.')

    const base64 = result.dataUrl.split(',')[1]
    const extension = mimeType === 'image/webp' ? '.webp' : '.jpg'
    return { base64, mimeType, fileName: file.name.replace(/\.[^.]+$/, '') + extension, bytes: result.bytes, previewUrl: result.dataUrl }
  } finally { URL.revokeObjectURL(objectUrl) }
}
