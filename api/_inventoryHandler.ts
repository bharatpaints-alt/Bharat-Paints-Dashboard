export type ApiError = { code: string; message: string }
export type ApiResponse<T> = { ok: true; data: T; error: null } | { ok: false; data: null; error: ApiError }

export type StockProduct = {
  product: string
  mrp: number
  rate: number
  showroom: number
  godown3: number
  gopalKunj: number
  total: number
  requiredQty: number
  minQty: number
  brand: string
}

let stockCache: { expires: number; products: StockProduct[] } | null = null

export function success<T>(data: T): ApiResponse<T> { return { ok: true, data, error: null } }
export function failure(code: string, message: string): ApiResponse<never> { return { ok: false, data: null, error: { code, message } } }
function number(value: string | undefined): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0 }
function brandOf(name: string): string { return name.trim().split(/\s+/)[0]?.toUpperCase() || 'OTHER' }

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1 } else quoted = !quoted
    } else if (char === ',' && !quoted) { row.push(field.trim()); field = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field.trim()); field = ''
      if (row.some(Boolean)) rows.push(row)
      row = []
    } else field += char
  }
  row.push(field.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

export function stockFromCsv(text: string): StockProduct[] {
  const rows = parseCsv(text)
  return rows.slice(1).flatMap((row) => {
    const product = row[0]?.trim()
    if (!product || product.toUpperCase() === 'PRODUCT NAME') return []
    return [{ product, mrp: number(row[1]), rate: number(row[2]), showroom: number(row[3]), godown3: number(row[4]), gopalKunj: number(row[5]), total: number(row[7]), requiredQty: number(row[8]), minQty: number(row[9]), brand: brandOf(product) }]
  })
}

async function getStock(): Promise<StockProduct[]> {
  if (stockCache && stockCache.expires > Date.now()) return stockCache.products
  const url = process.env.STOCK_CSV_URL
  if (!url) throw new Error('STOCK_CSV_URL is not configured on the server.')
  const separator = url.includes('?') ? '&' : '?'
  const response = await fetch(`${url}${separator}cachebust=${Date.now()}`, { redirect: 'follow' })
  if (!response.ok) throw new Error(`Stock source returned HTTP ${response.status}.`)
  const products = stockFromCsv(await response.text())
  if (!products.length) throw new Error('No products were returned by the stock source.')
  stockCache = { products, expires: Date.now() + 60_000 }
  return products
}

async function callGas(action: string, payload: Record<string, unknown>) {
  const url = process.env.GAS_API_URL
  const token = process.env.GAS_API_TOKEN
  if (!url || !token) throw new Error('Product picture API is not configured yet.')
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token, payload }),
    redirect: 'follow',
  })
  if (!response.ok) throw new Error(`Picture API returned HTTP ${response.status}.`)
  const text = await response.text()
  if (!text) throw new Error('Picture API returned an empty response.')
  let result: ApiResponse<unknown>
  try { result = JSON.parse(text) as ApiResponse<unknown> } catch { throw new Error('Picture API returned an unreadable response.') }
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

const PICTURE_ACTIONS = new Set(['getProductImages', 'getProductImageData', 'uploadProductImage', 'deleteProductImage', 'getAppSettings'])

export async function handleInventoryAction(action: string, payload: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  try {
    if (action === 'getStock') return success(await getStock())
    if (!PICTURE_ACTIONS.has(action)) return failure('UNKNOWN_ACTION', 'Unknown inventory action.')
    return success(await callGas(action, payload))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    return failure('REQUEST_FAILED', message)
  }
}
