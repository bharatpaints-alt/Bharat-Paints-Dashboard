import type { StockProduct } from '../types/inventory'
import { normalizeSearch, searchProducts } from './inventory'

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

// Word-level number conversion. Multi-digit words (ten, twenty, ...) map
// straight to their value. Single digits (zero..nine) are merged together in
// a later pass ONLY when spoken back-to-back, so "twenty litre" -> "20 lt"
// but "thinner five zero zero four" -> "thinner 5004" (digit-by-digit code
// reading), without a fragile rule that tries to tell those cases apart.
const NUMBER_WORDS: Record<string, string> = {
  // English
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
  ten: '10', eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19',
  twenty: '20', thirty: '30', forty: '40', fourty: '40', fifty: '50', sixty: '60', seventy: '70', eighty: '80', ninety: '90',
  // Hindi
  'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पांच': '5', 'पाँच': '5', 'छह': '6', 'छः': '6', 'सात': '7', 'आठ': '8', 'नौ': '9',
  'दस': '10', 'ग्यारह': '11', 'बारह': '12', 'तेरह': '13', 'चौदह': '14', 'पंद्रह': '15', 'सोलह': '16', 'सत्रह': '17', 'अठारह': '18', 'उन्नीस': '19',
  'बीस': '20', 'तीस': '30', 'चालीस': '40', 'पचास': '50', 'साठ': '60', 'सत्तर': '70', 'अस्सी': '80', 'नब्बे': '90',
}

// Multiplier words compose with an adjacent digit, e.g. "पांच हजार चार"
// (five thousand four) -> 5004, same target as digit-by-digit "5 0 0 4".
const MULTIPLIER_WORDS: Record<string, number> = { hundred: 100, thousand: 1000, 'सौ': 100, 'हज़ार': 1000, 'हजार': 1000 }

// Small, maintainable Devanagari -> Latin map for the paint-shop vocabulary
// this app actually deals with. Not a general Hindi transliterator — only
// the brand/terminology words employees are expected to say.
const WORD_TRANSLITERATIONS: Record<string, string> = {
  'रॉयल': 'royal', 'रॉयले': 'royale',
  'लग्ज़री': 'luxury', 'लक्ज़री': 'luxury',
  'ड्यूलक्स': 'dulux', 'डुलक्स': 'dulux',
  'प्रॉमिस': 'promise',
  'जीआईओ': 'gio', 'जियो': 'gio', 'जीओ': 'gio',
  'एक्सटीरियर': 'exterior',
  'सीलर': 'sealer',
  'प्राइमर': 'primer',
  'व्हाइट': 'white',
  'थिनर': 'thinner',
  'पेंट्स': 'paints', 'पेंट': 'paint',
  'एशियन': 'asian',
}

// Applied as whole-word phrase replacements after word-level normalisation.
// Kept intentionally small and literal — no aggressive stemming that could
// turn one product into a different one.
const PHRASE_SYNONYMS: [RegExp, string][] = [
  [/\basian paint\b/g, 'asian paints'],
  [/\bjio\b/g, 'gio'],
  [/\broyal luxury\b/g, 'royale luxury'],
]

// `\b` only recognises ASCII word characters, so it silently fails to match
// whole Devanagari words (लीटर never borders a \W the way English words do).
// Unicode-aware lookaround boundaries are used instead so both scripts work.
const UNIT_PATTERN = /(?<![\p{L}\p{N}])(litres?|liters?|ltrs?|lt|लीटर)(?![\p{L}\p{N}])/gu
const WEIGHT_PATTERN = /(?<![\p{L}\p{N}])(kilograms?|kgs?|किलोग्राम|किलो)(?![\p{L}\p{N}])/gu

// \p{M} (combining marks) is required alongside \p{L}: Devanagari vowel
// signs like ी/ा/ौ are Unicode Marks, not Letters, and stripping them
// corrupts words (e.g. "बीस" -> "ब स").
function stripPunctuation(value: string): string {
  return value.replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
}

function mapWords(tokens: string[]): string[] {
  return tokens.map((token) => NUMBER_WORDS[token] ?? WORD_TRANSLITERATIONS[token] ?? token)
}

// Composes "<digit> <multiplier> [<digit>]" runs, e.g. ["5","हजार","4"] -> ["5004"].
function composeMultipliers(tokens: string[]): string[] {
  const result: string[] = []
  for (let i = 0; i < tokens.length; i += 1) {
    const multiplier = MULTIPLIER_WORDS[tokens[i + 1]]
    if (/^\d+$/.test(tokens[i]) && multiplier) {
      const trailing = /^\d+$/.test(tokens[i + 2]) ? Number(tokens[i + 2]) : 0
      result.push(String(Number(tokens[i]) * multiplier + trailing))
      i += trailing ? 2 : 1
    } else {
      result.push(tokens[i])
    }
  }
  return result
}

// Merges consecutive single-digit tokens spoken back-to-back (a code read
// digit-by-digit), e.g. ["5","0","0","4"] -> ["5004"].
function mergeDigitRuns(tokens: string[]): string[] {
  const merged: string[] = []
  let run = ''
  for (const token of tokens) {
    if (/^\d$/.test(token)) {
      run += token
    } else {
      if (run) { merged.push(run); run = '' }
      merged.push(token)
    }
  }
  if (run) merged.push(run)
  return merged
}

/** Normalises a raw voice (or typed) transcript into a single search-ready string. */
export function normalizeVoiceQuery(raw: string): string {
  let text = stripPunctuation(raw.toLowerCase()).replace(/\s+/g, ' ').trim()
  if (!text) return ''
  text = text.replace(UNIT_PATTERN, 'lt').replace(WEIGHT_PATTERN, 'kg')
  let tokens = mapWords(text.split(' ').filter(Boolean))
  tokens = composeMultipliers(tokens)
  tokens = mergeDigitRuns(tokens)
  text = tokens.join(' ')
  for (const [pattern, replacement] of PHRASE_SYNONYMS) text = text.replace(pattern, replacement)
  return text.replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------------------
// Ranked product matching
// ---------------------------------------------------------------------------

export type MatchKind = 'exact' | 'best' | 'similar' | 'none'
export type VoiceSearchResult = { results: StockProduct[]; matchKind: MatchKind }

const MAX_RESULTS = 50

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const rows = a.length + 1
  const cols = b.length + 1
  const dist = Array.from({ length: rows }, (_, i) => [i, ...new Array(cols - 1).fill(0)])
  for (let j = 1; j < cols; j += 1) dist[0][j] = j
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost)
    }
  }
  return dist[rows - 1][cols - 1]
}

function fuzzyWordScore(queryWord: string, productWords: string[]): number {
  let best = 0
  for (const word of productWords) {
    if (word.startsWith(queryWord) || queryWord.startsWith(word)) { best = Math.max(best, 0.85); continue }
    const distance = levenshtein(queryWord, word)
    const similarity = 1 - distance / Math.max(queryWord.length, word.length)
    if (similarity > best) best = similarity
  }
  return best
}

/**
 * Ranks the loaded product list against a raw voice/typed query, strongest
 * matches first. Reuses normalizeSearch/searchProducts (the existing typed
 * search) as tier 3 rather than re-implementing it.
 */
export function rankedSearch(products: StockProduct[], rawQuery: string): VoiceSearchResult {
  const normalized = normalizeVoiceQuery(rawQuery)
  if (!normalized) return { results: [], matchKind: 'none' }
  const words = normalized.split(' ').filter(Boolean)

  // Tier 1: exact normalised product match
  const exact = products.filter((p) => normalizeVoiceQuery(p.product) === normalized)
  if (exact.length) return { results: exact.slice(0, MAX_RESULTS), matchKind: 'exact' }

  // Tier 2: product starts with the transcript
  const startsWith = products.filter((p) => normalizeVoiceQuery(p.product).startsWith(normalized))
  if (startsWith.length) return { results: startsWith.slice(0, MAX_RESULTS), matchKind: 'best' }

  // Tier 3: every spoken word found in the product name (existing typed-search logic)
  const allWords = searchProducts(products, normalized)
  if (allWords.length) return { results: allWords, matchKind: allWords.length <= 3 ? 'exact' : 'best' }

  // Tier 4: brand and pack-size match — the first word matches the brand and
  // at least one other word (e.g. a size like "20 lt") appears in the name.
  if (words.length > 1) {
    const brandMatches = products.filter((p) => {
      const brand = normalizeSearch(p.brand)
      const name = normalizeSearch(p.product)
      if (!brand.startsWith(words[0]) && !words[0].startsWith(brand)) return false
      return words.slice(1).some((word) => name.includes(word))
    })
    if (brandMatches.length) return { results: brandMatches.slice(0, MAX_RESULTS), matchKind: 'best' }
  }

  // Tier 5: partial substring match — any spoken word appears in the name
  const partial = products.filter((p) => {
    const name = normalizeSearch(p.product)
    return words.some((word) => word.length > 1 && name.includes(word))
  })
  if (partial.length) return { results: partial.slice(0, MAX_RESULTS), matchKind: 'similar' }

  // Tier 6: token-based fuzzy score, for mis-transcribed or misspelled queries
  const scored = scoreByFuzzyMatch(products, words)
    .filter((entry) => entry.score >= 0.6)
    .map((entry) => entry.product)
    .slice(0, MAX_RESULTS)

  return { results: scored, matchKind: scored.length ? 'similar' : 'none' }
}

function scoreByFuzzyMatch(products: StockProduct[], words: string[]): { product: StockProduct; score: number }[] {
  return products
    .map((product) => {
      const productWords = normalizeSearch(product.product).split(' ').filter(Boolean)
      const score = words.reduce((sum, word) => sum + fuzzyWordScore(word, productWords), 0) / words.length
      return { product, score }
    })
    .sort((a, b) => b.score - a.score)
}

/** "Did you mean" suggestions for the no-match state — same fuzzy scorer, no cutoff. */
export function suggestProducts(products: StockProduct[], rawQuery: string, limit = 5): StockProduct[] {
  const normalized = normalizeVoiceQuery(rawQuery)
  if (!normalized) return []
  const words = normalized.split(' ').filter(Boolean)
  return scoreByFuzzyMatch(products, words)
    .filter((entry) => entry.score > 0)
    .slice(0, limit)
    .map((entry) => entry.product)
}

// ---------------------------------------------------------------------------
// Deterministic voice commands (not a chatbot — normal product names always
// fall through to rankedSearch above)
// ---------------------------------------------------------------------------

export type VoiceCommand = 'order' | 'pictures' | 'dashboard' | 'clear' | 'searchAgain'

const COMMAND_PATTERNS: [RegExp, VoiceCommand][] = [
  [/^show( me)?( the)? items?( that need)? to order$/, 'order'],
  [/^show items requiring order$/, 'order'],
  [/^items to order$/, 'order'],
  [/^open pictures$/, 'pictures'],
  [/^show pictures$/, 'pictures'],
  [/^product pictures$/, 'pictures'],
  [/^open( the)? analytics dashboard$/, 'dashboard'],
  [/^open dashboard$/, 'dashboard'],
  [/^analytics dashboard$/, 'dashboard'],
  [/^clear( search)?$/, 'clear'],
  [/^search again$/, 'searchAgain'],
]

/** Matches a normalised transcript against a small, deterministic command table. */
export function matchVoiceCommand(normalized: string): VoiceCommand | null {
  for (const [pattern, command] of COMMAND_PATTERNS) if (pattern.test(normalized)) return command
  return null
}
