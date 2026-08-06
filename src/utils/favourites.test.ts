// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { getFavourites, isFavourite, toggleFavourite } from './favourites'

beforeEach(() => localStorage.clear())

describe('favourites', () => {
  it('starts empty', () => {
    expect(getFavourites()).toEqual([])
    expect(isFavourite('Anything')).toBe(false)
  })

  it('adds a product on first toggle', () => {
    toggleFavourite('Royale Luxury 20 LT')
    expect(getFavourites()).toEqual(['Royale Luxury 20 LT'])
    expect(isFavourite('Royale Luxury 20 LT')).toBe(true)
  })

  it('removes a product on second toggle', () => {
    toggleFavourite('A')
    toggleFavourite('A')
    expect(getFavourites()).toEqual([])
    expect(isFavourite('A')).toBe(false)
  })

  it('caps the list at a maximum of 20 products', () => {
    for (let i = 0; i < 25; i += 1) toggleFavourite(`Product ${i}`)
    expect(getFavourites()).toHaveLength(20)
  })

  it('does not evict existing favourites once the cap is reached — the employee must remove one first', () => {
    for (let i = 0; i < 20; i += 1) toggleFavourite(`Product ${i}`)
    toggleFavourite('One Too Many')
    const favourites = getFavourites()
    expect(favourites).toHaveLength(20)
    expect(favourites).not.toContain('One Too Many')
    expect(favourites).toContain('Product 0')
  })

  it('ignores blank product names', () => {
    toggleFavourite('   ')
    expect(getFavourites()).toEqual([])
  })
})
