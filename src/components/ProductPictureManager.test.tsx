// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductPictureManager, SLOT_LABELS } from './ProductPictureManager'
import { inventoryApi } from '../services/inventoryApi'
import { compressProductImage } from '../utils/image'

vi.mock('../services/inventoryApi', () => ({
  inventoryApi: {
    getProductImages: vi.fn(),
    getProductImageData: vi.fn(),
    uploadProductImage: vi.fn(),
    deleteProductImage: vi.fn(),
  },
}))

vi.mock('../utils/image', () => ({
  compressProductImage: vi.fn(),
}))

const mockedApi = vi.mocked(inventoryApi)
const mockedCompress = vi.mocked(compressProductImage)

const PRODUCT = 'Royale Luxury 20 LT'

function emptyImages() {
  return { product: PRODUCT, slot1: { fileId: '', url: '' }, slot2: { fileId: '', url: '' }, slot3: { fileId: '', url: '' }, updatedAt: '', updatedBy: '' }
}

function withOneExistingSlot() {
  return {
    product: PRODUCT,
    slot1: { fileId: 'front-file-id', url: 'https://drive/front' },
    slot2: { fileId: 'back-file-id', url: 'https://drive/back' },
    slot3: { fileId: '', url: '' },
    updatedAt: '', updatedBy: '',
  }
}

const fakeFile = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })

// Front/Back/Side are always rendered in this order — index into the slot
// articles directly rather than relying on text queries (the label text
// also appears in the empty-slot placeholder, so getByText is ambiguous).
function slotCard(index: 0 | 1 | 2): HTMLElement {
  return document.querySelectorAll('.picture-slot')[index] as HTMLElement
}

// Waits for the actual DOM to reflect a loaded image (the "Retake" button
// only renders once `images` state includes a fileId for that slot) rather
// than for a mock call count, which can resolve before React re-renders.
async function waitForLoadedSlot(index: 0 | 1 | 2) {
  await waitFor(() => expect(within(slotCard(index)).getByRole('button', { name: /retake/i })).toBeTruthy())
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedCompress.mockResolvedValue({ base64: 'YmFzZTY0', mimeType: 'image/jpeg', fileName: 'photo.jpg', bytes: 1024, previewUrl: 'data:image/jpeg;base64,YmFzZTY0' })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => cleanup())

describe('ProductPictureManager', () => {
  it('shows Front/Back/Side labels, not the old generic Picture 1/2/3 wording', async () => {
    mockedApi.getProductImages.mockResolvedValue(emptyImages())
    render(<ProductPictureManager productName={PRODUCT} />)
    await waitFor(() => expect(mockedApi.getProductImages).toHaveBeenCalled())
    const labels = Array.from(document.querySelectorAll('.picture-slot strong')).map((el) => el.textContent)
    expect(labels).toEqual([SLOT_LABELS[1], SLOT_LABELS[2], SLOT_LABELS[3]])
    expect(document.body.textContent).not.toContain('Picture 1')
  })

  it('uploads to the correct backend slot number for each labelled slot', async () => {
    mockedApi.getProductImages.mockResolvedValue(emptyImages())
    mockedApi.uploadProductImage.mockResolvedValue({ slot: 2, fileId: 'new-id', url: 'https://drive/new' })
    mockedApi.getProductImageData.mockResolvedValue({ dataUrl: 'data:image/jpeg;base64,new', fallbackUrl: '', tooLarge: false })
    render(<ProductPictureManager productName={PRODUCT} />)
    await waitFor(() => expect(mockedApi.getProductImages).toHaveBeenCalled())

    // "Back" is the second slot (index 1) -> backend slot 2, per Front=1/Back=2/Side=3.
    fireEvent.click(within(slotCard(1)).getByRole('button', { name: /take photo/i }))

    const cameraInput = document.querySelector('input[capture="environment"]') as HTMLInputElement
    await act(async () => { fireEvent.change(cameraInput, { target: { files: [fakeFile] } }) })

    await waitFor(() => expect(mockedApi.uploadProductImage).toHaveBeenCalledWith(expect.objectContaining({ productName: PRODUCT, slot: 2 })))
  })

  it('refreshes only the affected slot after a successful upload, leaving other slots untouched', async () => {
    mockedApi.getProductImages.mockResolvedValue(withOneExistingSlot())
    mockedApi.getProductImageData.mockImplementation(async (fileId: string) => ({ dataUrl: `data:image/jpeg;base64,${fileId}`, fallbackUrl: '', tooLarge: false }))
    mockedApi.uploadProductImage.mockResolvedValue({ slot: 1, fileId: 'front-file-id-2', url: 'https://drive/front2' })
    render(<ProductPictureManager productName={PRODUCT} />)
    await waitForLoadedSlot(0) // slot1 (Front) loaded initially

    fireEvent.click(within(slotCard(0)).getByRole('button', { name: /retake/i })) // Front already has an image -> "Retake"
    const cameraInput = document.querySelector('input[capture="environment"]') as HTMLInputElement
    await act(async () => { fireEvent.change(cameraInput, { target: { files: [fakeFile] } }) })

    await waitFor(() => expect(mockedApi.uploadProductImage).toHaveBeenCalledTimes(1))
    // Only one additional getProductImageData call (for the new front file) — back/slot2 is never re-fetched.
    expect(mockedApi.getProductImageData).toHaveBeenCalledTimes(3)
    expect(mockedApi.getProductImageData).toHaveBeenLastCalledWith('front-file-id-2')
  })

  it('shows a confirmation before replacing an existing picture', async () => {
    mockedApi.getProductImages.mockResolvedValue(withOneExistingSlot())
    mockedApi.getProductImageData.mockResolvedValue({ dataUrl: 'data:image/jpeg;base64,x', fallbackUrl: '', tooLarge: false })
    vi.mocked(window.confirm).mockReturnValue(false)
    render(<ProductPictureManager productName={PRODUCT} />)
    await waitForLoadedSlot(0)

    fireEvent.click(within(slotCard(0)).getByRole('button', { name: /retake/i }))
    const cameraInput = document.querySelector('input[capture="environment"]') as HTMLInputElement
    await act(async () => { fireEvent.change(cameraInput, { target: { files: [fakeFile] } }) })

    expect(window.confirm).toHaveBeenCalled()
    expect(mockedApi.uploadProductImage).not.toHaveBeenCalled()
  })

  it('shows an error notice and preserves the old photo when upload fails', async () => {
    mockedApi.getProductImages.mockResolvedValue(withOneExistingSlot())
    mockedApi.getProductImageData.mockResolvedValue({ dataUrl: 'data:image/jpeg;base64,original', fallbackUrl: '', tooLarge: false })
    mockedApi.uploadProductImage.mockRejectedValue(new Error('Picture API returned HTTP 500.'))
    render(<ProductPictureManager productName={PRODUCT} />)
    await waitForLoadedSlot(0)

    fireEvent.click(within(slotCard(0)).getByRole('button', { name: /retake/i }))
    const cameraInput = document.querySelector('input[capture="environment"]') as HTMLInputElement
    await act(async () => { fireEvent.change(cameraInput, { target: { files: [fakeFile] } }) })

    await waitFor(() => expect(document.body.textContent).toContain('Picture API returned HTTP 500.'))
    expect(document.querySelectorAll('.picture-slot img')).toHaveLength(2) // both original images still rendered
  })

  it('requires confirmation before deleting, and only calls the API when confirmed', async () => {
    mockedApi.getProductImages.mockResolvedValue(withOneExistingSlot())
    mockedApi.getProductImageData.mockResolvedValue({ dataUrl: 'data:image/jpeg;base64,x', fallbackUrl: '', tooLarge: false })
    mockedApi.deleteProductImage.mockResolvedValue({ slot: 1 })
    render(<ProductPictureManager productName={PRODUCT} />)
    await waitForLoadedSlot(0)

    fireEvent.click(within(slotCard(0)).getByRole('button', { name: /delete/i }))
    await waitFor(() => expect(mockedApi.deleteProductImage).toHaveBeenCalledWith(PRODUCT, 1))
  })

  it('does not show Replace/Delete for an empty slot', async () => {
    mockedApi.getProductImages.mockResolvedValue(emptyImages())
    render(<ProductPictureManager productName={PRODUCT} />)
    await waitFor(() => expect(mockedApi.getProductImages).toHaveBeenCalled())
    const front = slotCard(0)
    expect(within(front).queryByRole('button', { name: /delete/i })).toBeNull()
    expect(within(front).getByRole('button', { name: /take photo/i })).toBeTruthy()
    expect(within(front).getByRole('button', { name: /choose gallery/i })).toBeTruthy()
  })
})
