import type { ApiResponse, ProductImages, StockProduct } from '../types/inventory'

async function request<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/inventory', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  })
  const result = await response.json() as ApiResponse<T>
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
