import { describe, expect, it } from 'vitest'
import {
  calculateAccuracy,
  calculateWpm,
  createInitialTypingState,
  typingReducer,
} from './typingEngine'

describe('typing metrics', () => {
  it('calculates WPM and uses at least one second of elapsed time', () => {
    expect(calculateWpm(120, 60)).toBe(24)
    expect(calculateWpm(5, 0)).toBe(60)
  })

  it('calculates rounded accuracy and defaults to 100 with no keystrokes', () => {
    expect(calculateAccuracy(2, 3)).toBe(67)
    expect(calculateAccuracy(0, 0)).toBe(100)
  })
})

describe('typingReducer', () => {
  it('starts the timer on the first typed character', () => {
    const initial = createInitialTypingState('abc')

    expect(initial.status).toBe('idle')
    expect(initial.timeLeft).toBe(30)
    expect(initial.startedAt).toBeNull()

    const afterFirstKey = typingReducer(initial, {
      type: 'KEY',
      key: 'a',
      timestamp: 500,
    })

    expect(afterFirstKey.status).toBe('running')
    expect(afterFirstKey.startedAt).toBe(500)
    expect(afterFirstKey.timeLeft).toBe(30)
  })

  it('removes typed text on backspace without erasing keystroke totals', () => {
    const initial = createInitialTypingState('abc')
    const afterWrongKey = typingReducer(initial, {
      type: 'KEY',
      key: 'x',
      timestamp: 100,
    })
    const afterBackspace = typingReducer(afterWrongKey, {
      type: 'KEY',
      key: 'Backspace',
      timestamp: 200,
    })

    expect(afterBackspace.typed).toBe('')
    expect(afterBackspace.correctKeystrokes).toBe(0)
    expect(afterBackspace.totalKeystrokes).toBe(1)
    expect(afterBackspace.startedAt).toBe(100)
  })

  it('does not start the timer for a backspace with no typed characters', () => {
    const initial = createInitialTypingState('abc')

    expect(
      typingReducer(initial, {
        type: 'KEY',
        key: 'Backspace',
        timestamp: 100,
      }),
    ).toBe(initial)
  })

  it('locks input when the countdown reaches zero', () => {
    const running = typingReducer(createInitialTypingState('abc'), {
      type: 'KEY',
      key: 'a',
      timestamp: 1000,
    })
    const finished = typingReducer(running, {
      type: 'TICK',
      timestamp: 31_000,
    })
    const afterLockedInput = typingReducer(finished, {
      type: 'KEY',
      key: 'b',
      timestamp: 31_100,
    })

    expect(finished.status).toBe('finished')
    expect(finished.timeLeft).toBe(0)
    expect(finished.finishedAt).toBe(31_000)
    expect(afterLockedInput).toBe(finished)
  })

  it('keeps running after the passage is completed until the timer expires', () => {
    let state = createInitialTypingState('ab')
    state = typingReducer(state, { type: 'KEY', key: 'a', timestamp: 100 })
    state = typingReducer(state, { type: 'KEY', key: 'b', timestamp: 200 })

    expect(state.status).toBe('running')
    expect(state.typed).toBe('ab')
    expect(state.timeLeft).toBe(30)
    expect(state.correctKeystrokes).toBe(2)
    expect(state.totalKeystrokes).toBe(2)

    state = typingReducer(state, { type: 'TICK', timestamp: 30_100 })
    expect(state.status).toBe('finished')
    expect(state.timeLeft).toBe(0)
  })

  it('continues accepting keys after the target is exhausted', () => {
    let state = createInitialTypingState('a')
    state = typingReducer(state, { type: 'KEY', key: 'a', timestamp: 100 })
    state = typingReducer(state, { type: 'KEY', key: 'b', timestamp: 200 })

    expect(state.status).toBe('running')
    expect(state.typed).toBe('ab')
    expect(state.correctKeystrokes).toBe(1)
    expect(state.totalKeystrokes).toBe(2)
  })

  it('extends the target without resetting progress or the running timer', () => {
    const state = typingReducer(createInitialTypingState('abc'), {
      type: 'KEY',
      key: 'a',
      timestamp: 100,
    })
    const extended = typingReducer(state, {
      type: 'EXTEND',
      target: 'abcdef',
    })

    expect(extended.target).toBe('abcdef')
    expect(extended.typed).toBe('a')
    expect(extended.status).toBe('running')
    expect(extended.startedAt).toBe(100)
    expect(extended.totalKeystrokes).toBe(1)
  })

  it('resets all state for a new target', () => {
    const state = typingReducer(createInitialTypingState('old'), {
      type: 'RESET',
      target: 'new',
    })

    expect(state).toEqual(createInitialTypingState('new'))
  })
})
