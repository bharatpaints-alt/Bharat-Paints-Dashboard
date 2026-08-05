import type { SpeechErrorType, SpeechState, VoiceLanguage } from '../hooks/useSpeechRecognition'

const LANGUAGES: { id: VoiceLanguage; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' },
]

function errorMessage(errorType: SpeechErrorType | null): string {
  if (errorType === 'no-speech') return "We didn't hear anything. Tap the microphone and try again."
  if (errorType === 'network') return 'Check your connection and try again.'
  if (errorType === 'aborted') return 'Voice search was stopped. Tap the microphone to try again.'
  return 'Something went wrong with voice search. Please try again.'
}

/** Text/status area above the search results: idle/listening/processing/error copy, language selector, privacy note. */
export function VoiceSearchStatus({
  supported, speechState, errorType, transcript, interimTranscript, processing, language, onLanguageChange, onStop,
}: {
  supported: boolean
  speechState: SpeechState
  errorType: SpeechErrorType | null
  transcript: string
  interimTranscript: string
  processing: boolean
  language: VoiceLanguage
  onLanguageChange: (language: VoiceLanguage) => void
  onStop: () => void
}) {
  return (
    <div className="voice-status">
      {!supported ? (
        <>
          <strong>Voice search is not supported in this browser</strong>
          <p>You can still search by typing below.</p>
        </>
      ) : speechState === 'error' && errorType === 'permission-denied' ? (
        <>
          <strong>Microphone permission is blocked</strong>
          <p>Allow microphone access for this site in your browser settings, then tap the microphone again. Typed search always works.</p>
        </>
      ) : speechState === 'listening' ? (
        <>
          <strong>Listening…</strong>
          <p className="voice-transcript" aria-live="polite">{interimTranscript || transcript || 'Say a product name…'}</p>
          <button type="button" className="voice-stop-button" onClick={onStop}>Stop</button>
        </>
      ) : processing ? (
        <strong>Finding products…</strong>
      ) : speechState === 'error' ? (
        <>
          <strong>Voice search had a problem</strong>
          <p>{errorMessage(errorType)}</p>
        </>
      ) : (
        <>
          <strong>Tap and speak</strong>
          <p>English, Hindi and Hinglish supported</p>
        </>
      )}
      {supported && (
        <div className="voice-language-select" role="group" aria-label="Voice search language">
          {LANGUAGES.map(({ id, label }) => (
            <button key={id} type="button" className={language === id ? 'active' : ''} onClick={() => onLanguageChange(id)}>{label}</button>
          ))}
        </div>
      )}
      <p className="voice-privacy-note">Voice recognition is handled by your browser/device. You can always use typed search.</p>
    </div>
  )
}
