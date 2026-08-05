import { describe, expect, it } from 'vitest'
import { orderItems, searchProducts, stockStatus } from './inventory'
import type { StockProduct } from '../types/inventory'

const products: StockProduct[] = [
  { product: 'Asian Paints Apex 20 L', mrp: 100, rate: 80, showroom: 1, godown3: 2, gopalKunj: 3, total: 6, requiredQty: 0, minQty: 2, brand: 'ASIAN' },
  { product: 'Berger Weather Coat 10 L', mrp: 90, rate: 70, showroom: 0, godown3: 0, gopalKunj: 0, total: 0, requiredQty: 5, minQty: 5, brand: 'BERGER' },
]

function product(overrides: Partial<StockProduct>): StockProduct {
  return { product: 'X', mrp: 0, rate: 0, showroom: 0, godown3: 0, gopalKunj: 0, total: 0, requiredQty: 0, minQty: 0, brand: 'X', ...overrides }
}

describe('inventory helpers', () => {
  it('matches case-insensitive partial words with collapsed spaces', () => expect(searchProducts(products, '  ASIAN   20 ')).toEqual([products[0]]))
  it('uses only positive required quantity for orders', () => expect(orderItems(products)).toEqual([products[1]]))
})

describe('stockStatus', () => {
  it('is red when total stock is zero or less', () => {
    expect(stockStatus(product({ total: 0 })).level).toBe('red')
    expect(stockStatus(product({ total: -1 })).level).toBe('red')
  })
  it('is amber when required quantity is positive, even with healthy total stock', () => {
    expect(stockStatus(product({ total: 100, requiredQty: 5 })).level).toBe('amber')
  })
  it('is amber when total stock is at or below the minimum quantity', () => {
    expect(stockStatus(product({ total: 5, minQty: 5 })).level).toBe('amber')
    expect(stockStatus(product({ total: 3, minQty: 5 })).level).toBe('amber')
  })
  it('is green when stock is healthy, above minimum, and nothing is required', () => {
    expect(stockStatus(product({ total: 50, minQty: 5, requiredQty: 0 })).level).toBe('green')
  })
  it('does not treat a zero/unset minimum quantity as low stock', () => {
    expect(stockStatus(product({ total: 10, minQty: 0, requiredQty: 0 })).level).toBe('green')
  })
})
