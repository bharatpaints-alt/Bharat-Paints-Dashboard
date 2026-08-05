// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isSpeechRecognitionSupported, useSpeechRecognition } from './useSpeechRecognition'

type Listener = ((event: never) => void) | null

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = []
  lang = ''
  continuous = true
  interimResults = false
  maxAlternatives = 1
  started = false
  onresult: Listener = null
  onerror: Listener = null
  onend: (() => void) | null = null

  constructor() { MockSpeechRecognition.instances.push(this) }
  start() { this.started = true }
  stop() {
    if (!this.started) return
    this.started = false
    this.onend?.()
  }
  abort() { this.started = false }

  emitFinal(transcript: string) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, length: 1, 0: { transcript, confidence: 1 } }] } as never)
  }
  emitInterim(transcript: string) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal: false, length: 1, 0: { transcript, confidence: 1 } }] } as never)
  }
  emitError(error: string) {
    this.onerror?.({ error } as never)
  }
}

function install() {
  MockSpeechRecognition.instances = []
  ;(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = MockSpeechRecognition
}
function uninstall() {
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
  delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
}

describe('isSpeechRecognitionSupported', () => {
  afterEach(uninstall)
  it('is false when neither constructor exists', () => expect(isSpeechRecognitionSupported()).toBe(false))
  it('is true once SpeechRecognition is installed', () => { install(); expect(isSpeechRecognitionSupported()).toBe(true) })
})

describe('useSpeechRecognition', () => {
  beforeEach(install)
  afterEach(uninstall)

  it('configures the recognition instance per the spec (continuous=false, interimResults=true, maxAlternatives>1)', () => {
    const { result } = renderHook(() => useSpeechRecognition('en'))
    act(() => result.current.start())
    expect(MockSpeechRecognition.instances).toHaveLength(1)
    const instance = MockSpeechRecognition.instances[0]
    expect(instance.continuous).toBe(false)
    expect(instance.interimResults).toBe(true)
    expect(instance.maxAlternatives).toBeGreaterThan(1)
    expect(instance.lang).toBe('en-IN')
    expect(result.current.state).toBe('listening')
  })

  it('resolves hi-IN for the Hindi language option', () => {
    const { result } = renderHook(() => useSpeechRecognition('hi'))
    act(() => result.current.start())
    expect(MockSpeechRecognition.instances[0].lang).toBe('hi-IN')
  })

  it('prevents a second concurrent recognition instance', () => {
    const { result } = renderHook(() => useSpeechRecognition('en'))
    act(() => { result.current.start(); result.current.start() })
    expect(MockSpeechRecognition.instances).toHaveLength(1)
  })

  it('sets the transcript and stops automatically on a final result', () => {
    const { result } = renderHook(() => useSpeechRecognition('en'))
    act(() => result.current.start())
    const instance = MockSpeechRecognition.instances[0]
    act(() => instance.emitFinal('Royale Luxury 20 litre'))
    expect(result.current.transcript).toBe('Royale Luxury 20 litre')
    expect(instance.started).toBe(false)
    expect(result.current.state).toBe('idle')
  })

  it('shows the interim transcript while listening', () => {
    const { result } = renderHook(() => useSpeechRecognition('en'))
    act(() => result.current.start())
    act(() => MockSpeechRecognition.instances[0].emitInterim('royale lux'))
    expect(result.current.interimTranscript).toBe('royale lux')
  })

  it('ignores a duplicate final result from the same session', () => {
    const { result } = renderHook(() => useSpeechRecognition('en'))
    act(() => result.current.start())
    const instance = MockSpeechRecognition.instances[0]
    act(() => instance.emitFinal('first result'))
    act(() => instance.emitFinal('second result'))
    expect(result.current.transcript).toBe('first result')
  })

  it('maps a permission-denied error', () => {
    const { result } = renderHook(() => useSpeechRecognition('en'))
    act(() => result.current.start())
    act(() => MockSpeechRecognition.instances[0].emitError('not-allowed'))
    expect(result.current.error).toBe('permission-denied')
    expect(result.current.state).toBe('error')
  })

  it('maps a no-speech timeout error', () => {
    const { result } = renderHook(() => useSpeechRecognition('en'))
    act(() => result.current.start())
    act(() => MockSpeechRecognition.instances[0].emitError('no-speech'))
    expect(result.current.error).toBe('no-speech')
  })

  it('maps network and aborted errors', () => {
    const { result } = renderHook(() => useSpeechRecognition('en'))
    act(() => result.current.start())
    act(() => MockSpeechRecognition.instances[0].emitError('network'))
    expect(result.current.error).toBe('network')

    const { result: result2 } = renderHook(() => useSpeechRecognition('en'))
    act(() => result2.current.start())
    act(() => MockSpeechRecognition.instances[1].emitError('aborted'))
    expect(result2.current.error).toBe('aborted')
  })

  it('reports unsupported when no recognition constructor is available', () => {
    uninstall()
    const { result } = renderHook(() => useSpeechRecognition('en'))
    expect(result.current.supported).toBe(false)
  })

  it('aborts the active recognition safely on unmount', () => {
    const { result, unmount } = renderHook(() => useSpeechRecognition('en'))
    act(() => result.current.start())
    const instance = MockSpeechRecognition.instances[0]
    expect(instance.started).toBe(true)
    unmount()
    expect(instance.started).toBe(false)
  })

  it('clears both transcripts on resetTranscript', () => {
    const { result } = renderHook(() => useSpeechRecognition('en'))
    act(() => result.current.start())
    act(() => MockSpeechRecognition.instances[0].emitFinal('some product'))
    act(() => result.current.resetTranscript())
    expect(result.current.transcript).toBe('')
    expect(result.current.interimTranscript).toBe('')
  })
})
