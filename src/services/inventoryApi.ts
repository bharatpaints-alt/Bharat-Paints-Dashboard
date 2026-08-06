import type { ApiResponse, ProductImages, StockProduct } from '../types/inventory'
import { AuthRequiredError } from './authApi'

async function request<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/inventory', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  })
  if (response.status === 401) throw new AuthRequiredError()
  const text = await response.text()
  if (!text) throw new Error(`Server returned an empty response (HTTP ${response.status}).`)
  let result: ApiResponse<T>
  try { result = JSON.parse(text) as ApiResponse<T> }
  catch { throw new Error(`Server returned an unreadable response (HTTP ${response.status}).`) }
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

export const inventoryApi = {
  getStock: () => request<StockProduct[]>('getStock'),
  getProductImages: (productName: string) => request<ProductImages>('getProductImages', { productName }),
  getProductImageData: (fileId: string) => request<{ dataUrl: string; fallbackUrl: string; tooLarge: boolean }>('getProductImageData', { fileId }),
  uploadProductImage: (payload: { productName: string; slot: number; base64: string; mimeType: string; fileName: string }) => request<{ slot: number; fileId: string; url: string }>('uploadProductImage', payload),
  deleteProductImage: (productName: string, slot: number) => request<{ slot: number }>('deleteProductImage', { productName, slot }),
}
