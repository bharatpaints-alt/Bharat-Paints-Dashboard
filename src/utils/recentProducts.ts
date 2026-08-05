const STORAGE_KEY = 'bp-recent-products'
const MAX_RECENT = 5

function readStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []
  } catch { return [] }
}

function writeStorage(names: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(names)) } catch { /* storage unavailable (e.g. private browsing) — recent list just won't persist */ }
}

/** Product names only, no other detail — most recently viewed first, capped at 5. */
export function getRecentProducts(): string[] {
  return readStorage().slice(0, MAX_RECENT)
}

export function addRecentProduct(productName: string): string[] {
  const name = productName.trim()
  if (!name) return getRecentProducts()
  const next = [name, ...readStorage().filter((entry) => entry !== name)].slice(0, MAX_RECENT)
  writeStorage(next)
  return next
}

export function clearRecentProducts(): string[] {
  writeStorage([])
  return []
}
