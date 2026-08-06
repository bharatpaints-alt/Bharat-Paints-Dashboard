const STORAGE_KEY = 'bp-favourite-products'
const MAX_FAVOURITES = 20

function readStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []
  } catch { return [] }
}

function writeStorage(names: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(names)) } catch { /* storage unavailable (e.g. private browsing) — favourites just won't persist */ }
}

export function getFavourites(): string[] {
  return readStorage().slice(0, MAX_FAVOURITES)
}

export function isFavourite(productName: string): boolean {
  return readStorage().includes(productName)
}

/** Adds/removes the product and returns the updated list. Silently caps at 20 (oldest favourite is not evicted — the employee must remove one first). */
export function toggleFavourite(productName: string): string[] {
  const name = productName.trim()
  if (!name) return getFavourites()
  const current = readStorage()
  const next = current.includes(name)
    ? current.filter((entry) => entry !== name)
    : current.length >= MAX_FAVOURITES ? current : [...current, name]
  writeStorage(next)
  return next.slice(0, MAX_FAVOURITES)
}
