const SUPPORTED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const MAX_OUTPUT_BYTES = 1.5 * 1024 * 1024

export type CompressedImage = { base64: string; mimeType: 'image/jpeg'; fileName: string; bytes: number; previewUrl: string }

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
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Picture processing is unavailable in this browser.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    let quality = 0.82
    let dataUrl = canvas.toDataURL('image/jpeg', quality)
    while (Math.floor(dataUrl.length * 0.75) > MAX_OUTPUT_BYTES && quality > 0.6) {
      quality -= 0.05
      dataUrl = canvas.toDataURL('image/jpeg', quality)
    }
    const base64 = dataUrl.split(',')[1]
    const bytes = Math.floor(base64.length * 0.75)
    if (bytes > MAX_OUTPUT_BYTES) throw new Error('The compressed picture is still over 1.5 MB. Please choose a smaller image.')
    return { base64, mimeType: 'image/jpeg', fileName: file.name.replace(/\.[^.]+$/, '') + '.jpg', bytes, previewUrl: dataUrl }
  } finally { URL.revokeObjectURL(objectUrl) }
}
