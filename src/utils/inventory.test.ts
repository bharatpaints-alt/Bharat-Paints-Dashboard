import { describe, expect, it } from 'vitest'
import { orderItems, searchProducts } from './inventory'
import type { StockProduct } from '../types/inventory'

const products: StockProduct[] = [
  { product: 'Asian Paints Apex 20 L', mrp: 100, rate: 80, showroom: 1, godown3: 2, gopalKunj: 3, total: 6, requiredQty: 0, minQty: 2, brand: 'ASIAN' },
  { product: 'Berger Weather Coat 10 L', mrp: 90, rate: 70, showroom: 0, godown3: 0, gopalKunj: 0, total: 0, requiredQty: 5, minQty: 5, brand: 'BERGER' },
]

describe('inventory helpers', () => {
  it('matches case-insensitive partial words with collapsed spaces', () => expect(searchProducts(products, '  ASIAN   20 ')).toEqual([products[0]]))
  it('uses only positive required quantity for orders', () => expect(orderItems(products)).toEqual([products[1]]))
})
