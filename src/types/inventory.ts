export type PageId = 'home' | 'search' | 'order' | 'pictures'

export type StockProduct = {
  product: string
  mrp: number
  rate: number
  showroom: number
  godown3: number
  gopalKunj: number
  total: number
  requiredQty: number
  minQty: number
  brand: string
}

export type ImageSlot = { fileId: string; url: string; dataUrl?: string }
export type ProductImages = {
  product: string
  slot1: ImageSlot
  slot2: ImageSlot
  slot3: ImageSlot
  updatedAt: string
  updatedBy: string
}

export type ApiResponse<T> = { ok: true; data: T; error: null } | { ok: false; data: null; error: { code: string; message: string } }
