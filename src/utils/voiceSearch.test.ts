import { describe, expect, it } from 'vitest'
import { matchVoiceCommand, normalizeVoiceQuery, rankedSearch } from './voiceSearch'
import type { StockProduct } from '../types/inventory'

function product(name: string, brand: string, overrides: Partial<StockProduct> = {}): StockProduct {
  return { product: name, mrp: 100, rate: 80, showroom: 1, godown3: 2, gopalKunj: 3, total: 6, requiredQty: 0, minQty: 2, brand, ...overrides }
}

const products: StockProduct[] = [
  product('ASIAN ROYALE LUXURY EMULSION 20 LT', 'ASIAN'),
  product('DULUX PROMISE EMULSION 10 LT', 'DULUX'),
  product('DULUX PROMISE EMULSION 20 LT', 'DULUX'),
  product('APPG PRIMER 1 LT', 'APPG'),
  product('GIO EXTERIOR PAINT 20 LT', 'GIO'),
  product('ASIAN PAINTS WHITE PRIMER 1 LT', 'ASIAN'),
  product('THINNER 5004', 'THINNER'),
  product('PU CLEAR 1 LT', 'PU'),
  product('WHITE SEALER 1 LT', 'WHITE', { requiredQty: 3 }),
]

describe('normalizeVoiceQuery', () => {
  it('converts English multi-digit number words with units', () => {
    expect(normalizeVoiceQuery('twenty litre')).toBe('20 lt')
    expect(normalizeVoiceQuery('ten litre')).toBe('10 lt')
    expect(normalizeVoiceQuery('five litre')).toBe('5 lt')
  })
  it('converts Hindi number words with units', () => {
    expect(normalizeVoiceQuery('बीस लीटर')).toBe('20 lt')
    expect(normalizeVoiceQuery('दस लीटर')).toBe('10 lt')
    expect(normalizeVoiceQuery('पांच लीटर')).toBe('5 lt')
  })
  it('normalises brand phrase synonyms', () => {
    expect(normalizeVoiceQuery('asian paint')).toBe('asian paints')
    expect(normalizeVoiceQuery('jio paint')).toBe('gio paint')
    expect(normalizeVoiceQuery('जीओ')).toBe('gio')
    expect(normalizeVoiceQuery('royal luxury')).toBe('royale luxury')
  })
  it('preserves short brand/terminology tokens untouched', () => {
    expect(normalizeVoiceQuery('pu')).toBe('pu')
    expect(normalizeVoiceQuery('appg')).toBe('appg')
  })
  it('reads digit-by-digit product codes', () => {
    expect(normalizeVoiceQuery('thinner five zero zero four')).toBe('thinner 5004')
  })
  it('composes Hindi thousand-multiplier phrasing to the same code', () => {
    expect(normalizeVoiceQuery('थिनर पांच हजार चार')).toBe('thinner 5004')
  })
  it('transliterates Hindi brand/terminology words', () => {
    expect(normalizeVoiceQuery('रॉयल लग्ज़री बीस लीटर')).toBe('royale luxury 20 lt')
    expect(normalizeVoiceQuery('ड्यूलक्स प्रॉमिस दस लीटर')).toBe('dulux promise 10 lt')
    expect(normalizeVoiceQuery('जीआईओ एक्सटीरियर दिखाओ')).toBe('gio exterior दिखाओ')
  })
  it('lowercases, strips punctuation and collapses repeated spaces', () => {
    expect(normalizeVoiceQuery('  Royale,   Luxury!! ')).toBe('royale luxury')
  })
  it('returns an empty string for empty or whitespace-only input', () => {
    expect(normalizeVoiceQuery('')).toBe('')
    expect(normalizeVoiceQuery('   ')).toBe('')
  })
})

describe('rankedSearch', () => {
  it('finds an exact product with a full English phrase', () => {
    const { results, matchKind } = rankedSearch(products, 'Royale Luxury 20 litre')
    expect(results.map((p) => p.product)).toEqual(['ASIAN ROYALE LUXURY EMULSION 20 LT'])
    expect(matchKind).not.toBe('none')
  })
  it('finds the same product via the "royal luxury" synonym and number words', () => {
    const { results } = rankedSearch(products, 'royal luxury twenty litre')
    expect(results.map((p) => p.product)).toContain('ASIAN ROYALE LUXURY EMULSION 20 LT')
  })
  it('finds the same product from Devanagari transcript', () => {
    const { results } = rankedSearch(products, 'रॉयल लग्ज़री बीस लीटर')
    expect(results.map((p) => p.product)).toContain('ASIAN ROYALE LUXURY EMULSION 20 LT')
  })
  it('matches Dulux Promise 10 litre in English', () => {
    const { results } = rankedSearch(products, 'Dulux Promise 10 litre')
    expect(results.map((p) => p.product)).toEqual(['DULUX PROMISE EMULSION 10 LT'])
  })
  it('matches Dulux Promise 10 litre from Devanagari transcript', () => {
    const { results } = rankedSearch(products, 'ड्यूलक्स प्रॉमिस दस लीटर')
    expect(results.map((p) => p.product)).toEqual(['DULUX PROMISE EMULSION 10 LT'])
  })
  it('matches "APPG primer" without mangling the short brand token', () => {
    const { results } = rankedSearch(products, 'APPG primer')
    expect(results.map((p) => p.product)).toEqual(['APPG PRIMER 1 LT'])
  })
  it('matches "Gio exterior" and the equivalent Hindi command phrasing', () => {
    expect(rankedSearch(products, 'Gio exterior paint').results.map((p) => p.product)).toEqual(['GIO EXTERIOR PAINT 20 LT'])
    expect(rankedSearch(products, 'जीआईओ एक्सटीरियर दिखाओ').results.map((p) => p.product)).toContain('GIO EXTERIOR PAINT 20 LT')
  })
  it('matches a digit-by-digit product code', () => {
    const { results } = rankedSearch(products, 'thinner five zero zero four')
    expect(results.map((p) => p.product)).toEqual(['THINNER 5004'])
  })
  it('supports a brand-only query returning every product for that brand', () => {
    const { results } = rankedSearch(products, 'Dulux')
    expect(results.map((p) => p.product).sort()).toEqual(['DULUX PROMISE EMULSION 10 LT', 'DULUX PROMISE EMULSION 20 LT'])
  })
  it('supports a pack-size-only query', () => {
    const { results } = rankedSearch(products, '20 litre')
    expect(results.map((p) => p.product).sort()).toEqual([
      'ASIAN ROYALE LUXURY EMULSION 20 LT',
      'DULUX PROMISE EMULSION 20 LT',
      'GIO EXTERIOR PAINT 20 LT',
    ])
  })
  it('returns no results for an empty transcript', () => {
    expect(rankedSearch(products, '').matchKind).toBe('none')
    expect(rankedSearch(products, '   ').results).toEqual([])
  })
  it('returns no results for a transcript with no matching product', () => {
    const { results, matchKind } = rankedSearch(products, 'completely unrelated hovercraft parts')
    expect(results).toEqual([])
    expect(matchKind).toBe('none')
  })
  it('finds "Find white sealer" and "Search PU clear" style spoken commands as product searches', () => {
    expect(rankedSearch(products, 'Find white sealer').results.map((p) => p.product)).toContain('WHITE SEALER 1 LT')
    expect(rankedSearch(products, 'Search PU clear').results.map((p) => p.product)).toContain('PU CLEAR 1 LT')
  })
})

describe('matchVoiceCommand', () => {
  it('matches the optional deterministic commands', () => {
    expect(matchVoiceCommand(normalizeVoiceQuery('Show me products requiring order'))).toBeNull()
    expect(matchVoiceCommand(normalizeVoiceQuery('Show items to order'))).toBe('order')
    expect(matchVoiceCommand(normalizeVoiceQuery('Open pictures'))).toBe('pictures')
    expect(matchVoiceCommand(normalizeVoiceQuery('Open analytics dashboard'))).toBe('dashboard')
    expect(matchVoiceCommand(normalizeVoiceQuery('Clear search'))).toBe('clear')
    expect(matchVoiceCommand(normalizeVoiceQuery('Search again'))).toBe('searchAgain')
  })
  it('treats ordinary product names as product searches, not commands', () => {
    expect(matchVoiceCommand(normalizeVoiceQuery('Royale Luxury 20 litre'))).toBeNull()
    expect(matchVoiceCommand(normalizeVoiceQuery('Dulux Promise 10 litre'))).toBeNull()
  })
})
