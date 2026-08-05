import type { StockProduct } from '../types/inventory'

export function normalizeSearch(value: string): string { return value.toLowerCase().trim().replace(/\s+/g, ' ') }

export function searchProducts(products: StockProduct[], query: string): StockProduct[] {
  const words = normalizeSearch(query).split(' ').filter(Boolean)
  if (!words.length) return []
  return products.filter((product) => {
    const name = normalizeSearch(product.product)
    return words.every((word) => name.includes(word))
  }).slice(0, 50)
}

export function orderItems(products: StockProduct[]): StockProduct[] {
  return products.filter((product) => product.requiredQty > 0).sort((a, b) => b.requiredQty - a.requiredQty)
}

export function formatNumber(value: number): string { return value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) }
export function formatMoney(value: number): string { return value > 0 ? `₹${formatNumber(value)}` : '—' }
