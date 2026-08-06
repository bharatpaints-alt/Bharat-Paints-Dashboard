import { Mic, MicOff, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import type { PageId } from '../types/inventory'
import { matchVoiceCommand, normalizeVoiceQuery } from '../utils/voiceSearch'

const ANALYTICS_DASHBOARD_URL = 'https://bharat-paints-dashboard.vercel.app'

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern)
}

/**
 * Global voice entry point — visible on every page except Search (which
 * already has its own big mic). Simple page commands are handled directly;
 * a plain product phrase is handed off to Search via onProductQuery, which
 * runs it through the exact same rankedSearch/auto-expand pipeline.
 */
export function FloatingVoiceButton({ hidden, go, onProductQuery }: { hidden: boolean; go: (page: PageId) => void; onProductQuery: (text: string) => void }) {
  const { supported, state, transcript, start, stop, resetTranscript } = useSpeechRecognition('auto')
  const [notice, setNotice] = useState('')
  const [barcodeNotice, setBarcodeNotice] = useState(false)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => { clearTimeout(noticeTimer.current); clearTimeout(barcodeTimer.current) }, [])

  useEffect(() => {
    if (!transcript) return
    const normalized = normalizeVoiceQuery(transcript)
    const command = matchVoiceCommand(normalized)
    if (command === 'order') { go('order') }
    else if (command === 'pictures') { go('pictures') }
    else if (command === 'dashboard') { window.open(ANALYTICS_DASHBOARD_URL, '_blank', 'noopener') }
    else if (command === 'photoFront' || command === 'photoBack' || command === 'photoSide' || command === 'stock') { showNotice('Open a product on Search first.') }
    else if (command === 'clear' || command === 'searchAgain') { /* nothing to clear/repeat from here */ }
    else { onProductQuery(transcript) }
    resetTranscript()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript])

  function showNotice(text: string) {
    clearTimeout(noticeTimer.current)
    setNotice(text)
    noticeTimer.current = setTimeout(() => setNotice(''), 3000)
  }

  function press() {
    if (!supported) return
    vibrate(state === 'listening' ? 15 : 25)
    if (state === 'listening') stop(); else start()
  }

  function pressBarcode() {
    vibrate(15)
    clearTimeout(barcodeTimer.current)
    setBarcodeNotice(true)
    barcodeTimer.current = setTimeout(() => setBarcodeNotice(false), 2500)
  }

  if (hidden) return null

  return (
    <div className="floating-voice">
      {(notice || (state === 'listening') || barcodeNotice) && (
        <div className="floating-voice-bubble">
          {barcodeNotice ? 'Barcode Scanner Coming Soon' : notice || (state === 'listening' ? 'Listening…' : '')}
        </div>
      )}
      <button type="button" className="floating-barcode-button" onClick={pressBarcode} aria-label="Barcode scanner">
        <ScanLine size={20} />
      </button>
      <button
        type="button"
        className={`floating-mic-button ${state}`}
        onClick={press}
        disabled={!supported}
        aria-label={state === 'listening' ? 'Stop listening' : 'Speak to search'}
      >
        {state === 'listening' && <span className="voice-mic-pulse" aria-hidden="true" />}
        {state === 'error' || !supported ? <MicOff size={26} /> : <Mic size={26} />}
      </button>
    </div>
  )
}
