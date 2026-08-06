import { Mic, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState } from '../components/States'
import { ProductDetailCard } from '../components/ProductDetailCard'
import { SearchResultRow } from '../components/SearchResultRow'
import type { PictureSlot } from '../components/ProductPictureManager'
import { VoiceSearchButton, type MicState } from '../components/VoiceSearchButton'
import { VoiceSearchStatus } from '../components/VoiceSearchStatus'
import { useSpeechRecognition, type VoiceLanguage } from '../hooks/useSpeechRecognition'
import type { PageId, StockProduct } from '../types/inventory'
import { searchProducts } from '../utils/inventory'
import { matchVoiceCommand, normalizeVoiceQuery, rankedSearch, resolveAutoExpand, suggestProducts, type VoiceSearchResult } from '../utils/voiceSearch'
import { addRecentProduct, clearRecentProducts, getRecentProducts } from '../utils/recentProducts'

const ANALYTICS_DASHBOARD_URL = 'https://bharat-paints-dashboard.vercel.app'
const INITIAL_RESULT_COUNT = 6

export function SearchPage({ products, go, initialQuery, onInitialQueryConsumed }: {
  products: StockProduct[]
  go: (page: PageId) => void
  /** A voice phrase handed off from the global floating mic (see App.tsx) — processed exactly like SearchPage's own mic transcript. */
  initialQuery?: string
  onInitialQueryConsumed?: () => void
}) {
  const [input, setInput] = useState('')
  const [voiceResult, setVoiceResult] = useState<VoiceSearchResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [language, setLanguage] = useState<VoiceLanguage>('auto')
  const [expandedProduct, setExpandedProduct] = useState('')
  const [highlightSlot, setHighlightSlot] = useState<PictureSlot | null>(null)
  const [showAllResults, setShowAllResults] = useState(false)
  const [recentProducts, setRecentProducts] = useState<string[]>([])
  const [commandNotice, setCommandNotice] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const autoExpandedRef = useRef<string | null>(null)
  const commandNoticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const { supported, state: speechState, transcript, interimTranscript, error, start, stop, resetTranscript } = useSpeechRecognition(language)

  useEffect(() => { setRecentProducts(getRecentProducts()) }, [])
  useEffect(() => () => clearTimeout(commandNoticeTimer.current), [])

  // Search is fully local once stock has loaded — instant per keystroke, no debounce.
  const query = input
  const typedResults = useMemo(() => searchProducts(products, query), [products, query])

  function resetSearchState() {
    setVoiceResult(null); setExpandedProduct(''); setHighlightSlot(null); setShowAllResults(false)
  }

  function clearAll() {
    setInput(''); resetSearchState(); setProcessing(false)
    resetTranscript(); stop()
  }

  function startListening() {
    // A fresh voice session never combines with old typed/voice text or a previously open detail card.
    setInput(''); resetSearchState()
    start()
  }

  function handleMicPress() {
    if (speechState === 'listening') stop()
    else startListening()
  }

  function handleTypedChange(value: string) {
    if (speechState === 'listening') stop() // typing safely stops active recognition
    resetSearchState()
    setInput(value)
  }

  function showCommandNotice(text: string) {
    clearTimeout(commandNoticeTimer.current)
    setCommandNotice(text)
    commandNoticeTimer.current = setTimeout(() => setCommandNotice(''), 4000)
  }

  function openProduct(product: StockProduct) {
    setExpandedProduct(product.product)
    setHighlightSlot(null)
  }

  function closeProduct() {
    setExpandedProduct('')
    setHighlightSlot(null)
  }

  function requestPhotoSlot(slot: PictureSlot) {
    if (!expandedProduct) { showCommandNotice('Select a product first, then try again.'); return }
    // Never auto-opens the camera — only highlights the button for the employee to tap.
    setHighlightSlot(slot)
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (expandedProduct) setRecentProducts(addRecentProduct(expandedProduct))
  }, [expandedProduct])

  // Shared by both SearchPage's own mic (via `transcript`) and a voice phrase
  // handed off from the global floating button (via `initialQuery`) — one
  // code path, so both entry points behave identically.
  function processTranscript(text: string): (() => void) | void {
    const normalized = normalizeVoiceQuery(text)
    const command = matchVoiceCommand(normalized)
    if (command === 'order') { go('order'); resetTranscript(); return }
    if (command === 'pictures') {
      if (expandedProduct) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else go('pictures')
      resetTranscript(); return
    }
    if (command === 'stock') {
      if (expandedProduct) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else showCommandNotice('Select a product first to see its stock.')
      resetTranscript(); return
    }
    if (command === 'photoFront') { requestPhotoSlot(1); resetTranscript(); return }
    if (command === 'photoBack') { requestPhotoSlot(2); resetTranscript(); return }
    if (command === 'photoSide') { requestPhotoSlot(3); resetTranscript(); return }
    if (command === 'dashboard') { window.open(ANALYTICS_DASHBOARD_URL, '_blank', 'noopener'); resetTranscript(); return }
    if (command === 'clear') { clearAll(); resetTranscript(); return }
    if (command === 'searchAgain') { resetTranscript(); startListening(); return }

    setInput(text)
    setExpandedProduct(''); setHighlightSlot(null); setShowAllResults(false)
    setProcessing(true)
    const timer = setTimeout(() => { setVoiceResult(rankedSearch(products, text)); setProcessing(false) }, 150)
    return () => clearTimeout(timer)
  }

  useEffect(() => {
    if (!transcript) return
    return processTranscript(transcript)
    // Only the final transcript should re-run this — helpers close over fresh state each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript])

  useEffect(() => {
    if (!initialQuery) return
    const cleanup = processTranscript(initialQuery)
    onInitialQueryConsumed?.()
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  const micState: MicState = processing ? 'processing' : speechState === 'listening' ? 'listening' : speechState === 'error' ? 'error' : 'idle'
  const showingVoice = voiceResult !== null
  const results = showingVoice ? voiceResult.results : typedResults
  const noMatch = showingVoice && voiceResult.matchKind === 'none'
  const suggestions = noMatch ? suggestProducts(products, transcript, 5) : []
  const visibleResults = showAllResults ? results : results.slice(0, INITIAL_RESULT_COUNT)
  const moreCount = results.length - visibleResults.length

  // Auto-expand only once per distinct match, so a manual collapse is never fought.
  const autoExpandCandidate = resolveAutoExpand(voiceResult, typedResults)
  const autoExpandName = autoExpandCandidate?.product ?? null
  useEffect(() => {
    if (autoExpandName && autoExpandName !== autoExpandedRef.current) {
      setExpandedProduct(autoExpandName)
      autoExpandedRef.current = autoExpandName
    } else if (!autoExpandName) {
      autoExpandedRef.current = null
    }
  }, [autoExpandName])

  const expandedFromResults = products.find((p) => p.product === expandedProduct)

  return (
    <section className="page voice-search-page">
      <div className="page-title voice-hero">
        <p>Voice search</p>
        <h1>Ask Bharat Paints</h1>
        <span>Speak or type a product name</span>
      </div>

      <div className="voice-mic-row">
        <VoiceSearchButton state={micState} disabled={!supported} onPress={handleMicPress} />
      </div>

      <VoiceSearchStatus
        supported={supported}
        speechState={speechState}
        errorType={error}
        transcript={transcript}
        interimTranscript={interimTranscript}
        processing={processing}
        language={language}
        onLanguageChange={setLanguage}
        onStop={stop}
      />

      <label className="search-box">
        <Search size={21} />
        <input ref={inputRef} autoFocus value={input} onChange={(event) => handleTypedChange(event.target.value)} placeholder="e.g. Apex 20 litre" />
        <button onClick={clearAll} aria-label="Clear">{input ? <X size={18} /> : ''}</button>
      </label>

      {commandNotice && <div className="notice error">{commandNotice}</div>}

      {expandedFromResults && (
        <div ref={detailRef}>
          <ProductDetailCard
            product={expandedFromResults}
            onClose={closeProduct}
            highlightSlot={highlightSlot}
            onHighlightConsumed={() => setHighlightSlot(null)}
          />
        </div>
      )}

      {!query.trim() && !showingVoice && recentProducts.length > 0 && (
        <div className="recent-products">
          <div className="recent-products-heading">
            <h2>Recently Viewed</h2>
            <button type="button" onClick={() => setRecentProducts(clearRecentProducts())}>Clear Recent</button>
          </div>
          <div className="recent-products-list">
            {recentProducts.map((name) => {
              const product = products.find((p) => p.product === name)
              if (!product) return null
              return <button key={name} type="button" className="recent-product-chip" onClick={() => openProduct(product)}>{name}</button>
            })}
          </div>
        </div>
      )}

      {noMatch ? (
        <div className="voice-no-match">
          <strong>No exact product found</strong>
          <p>Edit the text above, or tap the microphone to try again.</p>
          {suggestions.length > 0 && (
            <>
              <p className="voice-suggestions-label">Closest suggestions</p>
              <div className="result-list">{suggestions.map((product) => <SearchResultRow key={product.product} product={product} onSelect={() => openProduct(product)} />)}</div>
            </>
          )}
          <button type="button" className="voice-retry-button" onClick={handleMicPress}><Mic size={18} /> Try again</button>
        </div>
      ) : !query.trim() && !showingVoice ? (
        <EmptyState title="Start typing or tap the microphone" text="Results show live stock at all three locations." />
      ) : results.length ? (
        <>
          <p className="result-count">
            {showingVoice
              ? voiceResult.matchKind === 'exact' ? 'Exact match' : voiceResult.matchKind === 'best' ? 'Best match' : 'Similar products'
              : `Showing ${results.length}${results.length === 50 ? '+' : ''} matches`}
          </p>
          <div className="result-list">
            {visibleResults.map((product, index) => (
              <SearchResultRow
                key={product.product}
                product={product}
                best={index === 0 && results.length > 1}
                selected={product.product === expandedProduct}
                onSelect={() => (product.product === expandedProduct ? closeProduct() : openProduct(product))}
              />
            ))}
          </div>
          {moreCount > 0 && (
            <button type="button" className="show-more-button" onClick={() => setShowAllResults(true)}>Show more results ({moreCount})</button>
          )}
        </>
      ) : (
        <EmptyState title="No product found" text="Try fewer words or check the spelling." />
      )}
    </section>
  )
}
