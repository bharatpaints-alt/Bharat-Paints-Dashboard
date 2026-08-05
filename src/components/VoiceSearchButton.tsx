import { Mic, MicOff } from 'lucide-react'

export type MicState = 'idle' | 'listening' | 'processing' | 'error'

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern)
}

/** The large circular mic button — idle/listening/processing/error visuals, subtle pulse + vibration only. */
export function VoiceSearchButton({ state, disabled, onPress }: { state: MicState; disabled?: boolean; onPress: () => void }) {
  const isListening = state === 'listening'
  function handleClick() {
    vibrate(isListening ? 15 : 25)
    onPress()
  }
  return (
    <button
      type="button"
      className={`voice-mic-button ${state}`}
      onClick={handleClick}
      disabled={disabled || state === 'processing'}
      aria-pressed={isListening}
      aria-label={isListening ? 'Stop listening' : 'Tap and speak'}
    >
      {isListening && <span className="voice-mic-pulse" aria-hidden="true" />}
      {state === 'error' ? <MicOff size={30} /> : <Mic size={30} />}
    </button>
  )
}
