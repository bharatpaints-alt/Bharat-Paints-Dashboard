// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchPage } from './SearchPage'
import { inventoryApi } from '../services/inventoryApi'
import type { StockProduct } from '../types/inventory'

vi.mock('../services/inventoryApi', () => ({
  inventoryApi: {
    getProductImages: vi.fn(),
    getProductImageData: vi.fn(),
    uploadProductImage: vi.fn(),
    deleteProductImage: vi.fn(),
  },
}))
const mockedApi = vi.mocked(inventoryApi)

function product(name: string, brand: string, overrides: Partial<StockProduct> = {}): StockProduct {
  return { product: name, mrp: 100, rate: 80, showroom: 1, godown3: 2, gopalKunj: 3, total: 6, requiredQty: 0, minQty: 2, brand, ...overrides }
}

const ROYALE = product('ASIAN ROYALE LUXURY EMULSION 20 LT', 'ASIAN')
const DULUX_A = product('DULUX PROMISE EMULSION 10 LT', 'DULUX')
const DULUX_B = product('DULUX PROMISE EMULSION 20 LT', 'DULUX')
const products = [ROYALE, DULUX_A, DULUX_B]

type Listener = ((event: never) => void) | null

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = []
  lang = ''; continuous = true; interimResults = false; maxAlternatives = 1; started = false
  onresult: Listener = null
  onerror: Listener = null
  onend: (() => void) | null = null
  constructor() { MockSpeechRecognition.instances.push(this) }
  start() { this.started = true }
  stop() { if (!this.started) return; this.started = false; this.onend?.() }
  abort() { this.started = false }
  emitFinal(transcript: string) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, length: 1, 0: { transcript, confidence: 1 } }] } as never)
  }
}

function installSpeechRecognition() {
  MockSpeechRecognition.instances = []
  ;(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = MockSpeechRecognition
}
function uninstallSpeechRecognition() {
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
}

const noGo = () => {}
const emptyImages = { product: '', slot1: { fileId: '', url: '' }, slot2: { fileId: '', url: '' }, slot3: { fileId: '', url: '' }, updatedAt: '', updatedBy: '' }

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  installSpeechRecognition()
  mockedApi.getProductImages.mockResolvedValue(emptyImages)
})
afterEach(() => { cleanup(); uninstallSpeechRecognition() })

async function speak(text: string) {
  fireEvent.click(screen.getByRole('button', { name: /tap and speak/i }))
  const instance = MockSpeechRecognition.instances[MockSpeechRecognition.instances.length - 1]
  await act(async () => instance.emitFinal(text))
}

describe('SearchPage', () => {
  it('auto-expands the product detail card for a single clear typed result', async () => {
    render(<SearchPage products={products} go={noGo} />)
    fireEvent.change(screen.getByPlaceholderText(/apex 20 litre/i), { target: { value: 'Royale Luxury 20 LT' } })
    await waitFor(() => expect(screen.getByRole('heading', { name: /royale luxury/i, level: 2 })).toBeTruthy(), { timeout: 2000 })
  })

  it('does not auto-expand a broad typed query with multiple candidates', async () => {
    render(<SearchPage products={products} go={noGo} />)
    fireEvent.change(screen.getByPlaceholderText(/apex 20 litre/i), { target: { value: 'Dulux' } })
    await waitFor(() => expect(screen.getAllByText(/dulux promise/i).length).toBeGreaterThan(0))
    // Result rows use <h3> (also role="heading") — only a <h2> comes from an expanded ProductDetailCard.
    expect(screen.queryByRole('heading', { name: /dulux promise/i, level: 2 })).toBeNull()
  })

  it('routes the "Show items to order" voice command to the order page', async () => {
    const go = vi.fn()
    render(<SearchPage products={products} go={go} />)
    await speak('Show items to order')
    await waitFor(() => expect(go).toHaveBeenCalledWith('order'))
  })

  it('shows a notice for a photo voice command when no product is selected yet', async () => {
    render(<SearchPage products={products} go={noGo} />)
    await speak('Take front photo')
    await waitFor(() => expect(screen.getByText(/select a product first/i)).toBeTruthy())
  })

  it('records a viewed product in Recently Viewed, and Clear Recent empties it', async () => {
    render(<SearchPage products={products} go={noGo} />)
    fireEvent.change(screen.getByPlaceholderText(/apex 20 litre/i), { target: { value: 'Royale Luxury 20 LT' } })
    await waitFor(() => expect(screen.getByRole('heading', { name: /royale luxury/i, level: 2 })).toBeTruthy())

    fireEvent.change(screen.getByPlaceholderText(/apex 20 litre/i), { target: { value: '' } })
    await waitFor(() => expect(screen.getByText('Recently Viewed')).toBeTruthy())
    expect(screen.getByText(ROYALE.product)).toBeTruthy()

    fireEvent.click(screen.getByText('Clear Recent'))
    await waitFor(() => expect(screen.queryByText('Recently Viewed')).toBeNull())
  })
})
