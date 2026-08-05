import { Mic, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState } from '../components/States'
import { ProductCard } from '../components/ProductCard'
import { VoiceSearchButton, type MicState } from '../components/VoiceSearchButton'
import { VoiceSearchStatus } from '../components/VoiceSearchStatus'
import { useSpeechRecognition, type VoiceLanguage } from '../hooks/useSpeechRecognition'
import type { PageId, StockProduct } from '../types/inventory'
import { searchProducts } from '../utils/inventory'
import { matchVoiceCommand, normalizeVoiceQuery, rankedSearch, suggestProducts, type VoiceSearchResult } from '../utils/voiceSearch'

const ANALYTICS_DASHBOARD_URL = 'https://bharat-paints-dashboard.vercel.app'

export function SearchPage({ products, openPictures, go }: { products: StockProduct[]; openPictures: (name: string) => void; go: (page: PageId) => void }) {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [voiceResult, setVoiceResult] = useState<VoiceSearchResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [language, setLanguage] = useState<VoiceLanguage>('auto')
  const inputRef = useRef<HTMLInputElement>(null)

  const { supported, state: speechState, transcript, interimTranscript, error, start, stop, resetTranscript } = useSpeechRecognition(language)

  // Typed search keeps the original debounce + searchProducts pipeline exactly as before.
  useEffect(() => { const timer = setTimeout(() => setQuery(input), 300); return () => clearTimeout(timer) }, [input])
  const typedResults = useMemo(() => searchProducts(products, query), [products, query])

  function clearAll() {
    setInput(''); setQuery(''); setVoiceResult(null); setProcessing(false)
    resetTranscript(); stop()
  }

  function startListening() {
    // A fresh voice session never combines with old typed/voice text.
    setInput(''); setQuery(''); setVoiceResult(null)
    start()
  }

  function handleMicPress() {
    if (speechState === 'listening') stop()
    else startListening()
  }

  function handleTypedChange(value: string) {
    if (speechState === 'listening') stop() // typing safely stops active recognition
    setVoiceResult(null)
    setInput(value)
  }

  useEffect(() => {
    if (!transcript) return
    const normalized = normalizeVoiceQuery(transcript)
    const command = matchVoiceCommand(normalized)
    if (command === 'order') { go('order'); resetTranscript(); return }
    if (command === 'pictures') { go('pictures'); resetTranscript(); return }
    if (command === 'dashboard') { window.open(ANALYTICS_DASHBOARD_URL, '_blank', 'noopener'); resetTranscript(); return }
    if (command === 'clear') { clearAll(); resetTranscript(); return }
    if (command === 'searchAgain') { resetTranscript(); startListening(); return }

    setInput(transcript)
    setProcessing(true)
    const timer = setTimeout(() => { setVoiceResult(rankedSearch(products, transcript)); setProcessing(false) }, 150)
    return () => clearTimeout(timer)
    // Only the final transcript should re-run this — helpers close over fresh state each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript])

  const micState: MicState = processing ? 'processing' : speechState === 'listening' ? 'listening' : speechState === 'error' ? 'error' : 'idle'
  const showingVoice = voiceResult !== null
  const results = showingVoice ? voiceResult.results : typedResults
  const noMatch = showingVoice && voiceResult.matchKind === 'none'
  const suggestions = noMatch ? suggestProducts(products, transcript, 5) : []

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

      {noMatch ? (
        <div className="voice-no-match">
          <strong>No exact product found</strong>
          <p>Edit the text above, or tap the microphone to try again.</p>
          {suggestions.length > 0 && (
            <>
              <p className="voice-suggestions-label">Closest suggestions</p>
              <div className="product-list">{suggestions.map((product) => <ProductCard key={product.product} product={product} onPictures={openPictures} />)}</div>
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
          <div className="product-list">{results.map((product) => <ProductCard key={product.product} product={product} onPictures={openPictures} />)}</div>
        </>
      ) : (
        <EmptyState title="No product found" text="Try fewer words or check the spelling." />
      )}
    </section>
  )
}
