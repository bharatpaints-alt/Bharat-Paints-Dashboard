import { describe, expect, it } from 'vitest'
import { planCompression, type EncodeFn } from './image'

const TARGET_BYTES = 100 * 1024
const MIN_SIDE = 400

/** A fake encoder with a fully deterministic, controllable size model, so the
 * planning LOOP can be tested without needing real canvas/WebP encoding. */
function fakeEncoder(bytesPerPixelAtFullQuality: number, calls: { width: number; height: number; quality: number }[]): EncodeFn {
  return (width, height, quality) => {
    calls.push({ width, height, quality })
    const bytes = Math.round(width * height * quality * bytesPerPixelAtFullQuality)
    return { dataUrl: `data:image/webp;base64,${'A'.repeat(4)}`, bytes }
  }
}

describe('planCompression', () => {
  it('stops as soon as the target is met, without compressing further than necessary', () => {
    const calls: { width: number; height: number; quality: number }[] = []
    // Deliberately tiny so even full quality at 1000px is already under 100KB.
    const result = planCompression(1000, 1000, fakeEncoder(0.00005, calls))
    expect(result.bytes).toBeLessThanOrEqual(TARGET_BYTES)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual({ width: 1000, height: 1000, quality: 0.75 })
  })

  it('reduces quality before ever shrinking dimensions', () => {
    const calls: { width: number; height: number; quality: number }[] = []
    // At 1000px: full quality (0.75) is over target, but the floor (0.35) fits.
    const result = planCompression(1000, 1000, fakeEncoder(0.2, calls))
    expect(result.bytes).toBeLessThanOrEqual(TARGET_BYTES)
    expect(calls.every((c) => c.width === 1000 && c.height === 1000)).toBe(true)
    expect(calls.length).toBeGreaterThan(1) // had to step quality down
  })

  it('shrinks dimensions only once quality reduction alone cannot reach the target', () => {
    const calls: { width: number; height: number; quality: number }[] = []
    // Even at the quality floor, 1000px is too big — must shrink dimensions too.
    const result = planCompression(1000, 1000, fakeEncoder(0.5, calls))
    expect(result.bytes).toBeLessThanOrEqual(TARGET_BYTES)
    const dimensionsUsed = new Set(calls.map((c) => c.width))
    expect(dimensionsUsed.size).toBeGreaterThan(1) // more than one dimension round happened
    expect(Math.max(...calls.map((c) => c.width))).toBeLessThanOrEqual(1000)
  })

  it('never shrinks below the minimum side, and still terminates for an unreachable target', () => {
    const calls: { width: number; height: number; quality: number }[] = []
    // Byte cost so high that even 400px at the lowest quality stays over target.
    const result = planCompression(1000, 1000, fakeEncoder(1, calls))
    expect(Math.max(...calls.map((c) => c.width))).toBeGreaterThanOrEqual(MIN_SIDE)
    expect(calls.every((c) => c.width >= MIN_SIDE)).toBe(true)
    expect(result).toBeTruthy() // returns a best-effort result instead of hanging/throwing
  })

  it('preserves aspect ratio across every dimension it tries', () => {
    const calls: { width: number; height: number; quality: number }[] = []
    planCompression(1600, 900, fakeEncoder(1, calls)) // 16:9, forces multiple shrink rounds
    for (const call of calls) {
      expect(call.width / call.height).toBeCloseTo(1600 / 900, 1)
    }
  })

  it('never upscales an image already smaller than the 1000px cap', () => {
    const calls: { width: number; height: number; quality: number }[] = []
    planCompression(300, 200, fakeEncoder(0.00005, calls))
    expect(calls[0]).toEqual({ width: 300, height: 200, quality: 0.75 })
  })
})
