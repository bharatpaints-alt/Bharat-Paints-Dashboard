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

export type StockStatus = { level: 'red' | 'amber' | 'green'; label: string }

// The exact existing business rules (see RECOVERY_REPORT.md): out of stock,
// low stock, and needs-reorder are not redefined here, only labelled.
export function stockStatus(product: StockProduct): StockStatus {
  if (product.total <= 0) return { level: 'red', label: 'Out of stock' }
  if (product.requiredQty > 0) return { level: 'amber', label: 'Order needed' }
  if (product.minQty > 0 && product.total <= product.minQty) return { level: 'amber', label: 'Low stock' }
  return { level: 'green', label: 'In stock' }
}
