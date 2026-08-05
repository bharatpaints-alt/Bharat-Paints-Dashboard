// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { addRecentProduct, clearRecentProducts, getRecentProducts } from './recentProducts'

beforeEach(() => localStorage.clear())

describe('recentProducts', () => {
  it('returns an empty list when nothing has been viewed', () => {
    expect(getRecentProducts()).toEqual([])
  })

  it('adds a viewed product to the front of the list', () => {
    addRecentProduct('Royale Luxury 20 LT')
    expect(getRecentProducts()).toEqual(['Royale Luxury 20 LT'])
  })

  it('moves a re-viewed product back to the front instead of duplicating it', () => {
    addRecentProduct('A'); addRecentProduct('B'); addRecentProduct('A')
    expect(getRecentProducts()).toEqual(['A', 'B'])
  })

  it('caps the list at a maximum of 5 products, dropping the oldest', () => {
    ;['A', 'B', 'C', 'D', 'E', 'F'].forEach((name) => addRecentProduct(name))
    const recent = getRecentProducts()
    expect(recent).toHaveLength(5)
    expect(recent).toEqual(['F', 'E', 'D', 'C', 'B'])
    expect(recent).not.toContain('A')
  })

  it('persists across calls via localStorage', () => {
    addRecentProduct('Persisted Product')
    expect(getRecentProducts()).toEqual(['Persisted Product'])
  })

  it('clears the list on request', () => {
    addRecentProduct('A'); addRecentProduct('B')
    expect(clearRecentProducts()).toEqual([])
    expect(getRecentProducts()).toEqual([])
  })

  it('ignores blank product names', () => {
    addRecentProduct('   ')
    expect(getRecentProducts()).toEqual([])
  })
})
