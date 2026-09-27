import { describe, expect, it } from 'vitest'
import { shouldFollowLatest } from './chatScroll'

describe('chat scroll behavior', () => {
  it('follows a new answer when the user is already near the bottom', () => {
    expect(shouldFollowLatest({ distanceFromBottom: 20, userScrolled: false })).toBe(true)
    expect(shouldFollowLatest({ distanceFromBottom: 20, userScrolled: true })).toBe(true)
  })

  it('does not force-scroll a user reading an earlier answer', () => {
    expect(shouldFollowLatest({ distanceFromBottom: 180, userScrolled: true })).toBe(false)
  })

  it('supports a custom proximity threshold', () => {
    expect(shouldFollowLatest({ distanceFromBottom: 64, userScrolled: true, thresholdPx: 72 })).toBe(true)
    expect(shouldFollowLatest({ distanceFromBottom: 80, userScrolled: true, thresholdPx: 72 })).toBe(false)
  })
})
