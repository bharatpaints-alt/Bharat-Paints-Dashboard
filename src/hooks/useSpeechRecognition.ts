import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal local typings for the (non-standard) Web Speech API — declared
// inside this module so they never collide with any ambient `lib.dom`
// definitions, and so no extra @types dependency is needed.
interface SpeechRecognitionAlternative { transcript: string; confidence: number }
interface SpeechRecognitionResult { isFinal: boolean; length: number; [index: number]: SpeechRecognitionAlternative }
interface SpeechRecognitionResultList { length: number; [index: number]: SpeechRecognitionResult }
interface SpeechRecognitionEvent { resultIndex: number; results: SpeechRecognitionResultList }
interface SpeechRecognitionErrorEvent { error: string }
interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

export type VoiceLanguage = 'auto' | 'en' | 'hi'
export type SpeechState = 'idle' | 'listening' | 'error'
export type SpeechErrorType = 'permission-denied' | 'no-speech' | 'network' | 'aborted' | 'other'

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const global = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }
  return global.SpeechRecognition ?? global.webkitSpeechRecognition ?? null
}

/** Feature-detects browser speech recognition support without instantiating it. */
export function isSpeechRecognitionSupported(): boolean {
  return getRecognitionConstructor() !== null
}

function resolveLang(language: VoiceLanguage): string {
  if (language === 'en') return 'en-IN'
  if (language === 'hi') return 'hi-IN'
  const deviceLang = typeof navigator !== 'undefined' ? navigator.language : ''
  return deviceLang?.toLowerCase().startsWith('hi') ? 'hi-IN' : 'en-IN'
}

function mapErrorCode(code: string): SpeechErrorType {
  if (code === 'not-allowed' || code === 'permission-denied' || code === 'service-not-allowed') return 'permission-denied'
  if (code === 'no-speech') return 'no-speech'
  if (code === 'network') return 'network'
  if (code === 'aborted') return 'aborted'
  return 'other'
}

/**
 * Wraps SpeechRecognition/webkitSpeechRecognition with a small state machine:
 * feature-detected support, guarded single-instance start/stop, one final
 * transcript per session, and mapped error states. Never logs transcripts —
 * they only ever live in React state here and in the caller.
 */
export function useSpeechRecognition(language: VoiceLanguage) {
  const [state, setState] = useState<SpeechState>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<SpeechErrorType | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const activeRef = useRef(false)
  const languageRef = useRef(language)
  languageRef.current = language

  const supported = isSpeechRecognitionSupported()

  const stop = useCallback(() => {
    if (activeRef.current) recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    if (activeRef.current) return // never allow a second concurrent instance
    const Ctor = getRecognitionConstructor()
    if (!Ctor) { setError('other'); setState('error'); return }

    const recognition = new Ctor()
    recognition.lang = resolveLang(languageRef.current)
    recognition.continuous = false
    recognition.interimResults = true
    try { recognition.maxAlternatives = 3 } catch { /* some implementations don't support this */ }

    let handledFinal = false
    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal) finalText += result[0].transcript
        else interimText += result[0].transcript
      }
      if (finalText && !handledFinal) {
        handledFinal = true // guards against duplicate result handling
        setTranscript(finalText.trim())
        setInterimTranscript('')
        recognition.stop() // stop as soon as we have a final result
      } else if (interimText) {
        setInterimTranscript(interimText)
      }
    }
    recognition.onerror = (event) => {
      setError(mapErrorCode(event.error))
      setState('error')
    }
    recognition.onend = () => {
      activeRef.current = false
      recognitionRef.current = null
      setState((current) => (current === 'error' ? current : 'idle'))
    }

    recognitionRef.current = recognition
    activeRef.current = true
    setError(null)
    setTranscript('') // fresh session so an identical repeated phrase still re-triggers callers watching transcript
    setInterimTranscript('')
    setState('listening')
    recognition.start()
  }, [])

  const resetTranscript = useCallback(() => { setTranscript(''); setInterimTranscript('') }, [])

  // Stop safely on navigation or component unmount.
  useEffect(() => () => {
    if (activeRef.current) recognitionRef.current?.abort()
    activeRef.current = false
  }, [])

  return { supported, state, transcript, interimTranscript, error, start, stop, resetTranscript }
}
