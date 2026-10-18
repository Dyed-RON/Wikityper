import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTypingTest } from './useTypingTest'

function keyboardEvent(key: string, options: { ctrlKey?: boolean } = {}) {
  return {
    key,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: false,
    altKey: false,
    isComposing: false,
    preventDefault: vi.fn(),
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-18T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useTypingTest', () => {
  it('keeps the countdown idle until a character is typed, then ticks once per second', () => {
    const { result } = renderHook(() => useTypingTest('abc'))

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.status).toBe('idle')
    expect(result.current.timeLeft).toBe(30)

    act(() => {
      result.current.handleKeyDown(keyboardEvent('a'))
    })
    expect(result.current.status).toBe('running')
    expect(result.current.startedAt).toBe(Date.now())

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.timeLeft).toBe(29)
    expect(result.current.elapsedSeconds).toBe(1)
  })

  it('finishes and locks input when the countdown expires', () => {
    const { result } = renderHook(() => useTypingTest('abc'))

    act(() => {
      result.current.handleKeyDown(keyboardEvent('a'))
    })

    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    expect(result.current.status).toBe('finished')
    expect(result.current.timeLeft).toBe(0)
    expect(result.current.typed).toBe('a')

    act(() => {
      result.current.handleKeyDown(keyboardEvent('b'))
    })
    expect(result.current.typed).toBe('a')
  })

  it('finishes early when all passage characters have been entered', () => {
    const { result } = renderHook(() => useTypingTest('a'))

    act(() => {
      result.current.handleKeyDown(keyboardEvent('a'))
    })

    expect(result.current.status).toBe('finished')
    expect(result.current.timeLeft).toBe(30)
    expect(result.current.accuracy).toBe(100)
  })

  it('ignores modifiers and navigation keys and prevents space and backspace defaults', () => {
    const { result } = renderHook(() => useTypingTest('a b'))
    const modified = keyboardEvent('x', { ctrlKey: true })
    const arrow = keyboardEvent('ArrowLeft')
    const space = keyboardEvent(' ')

    act(() => {
      result.current.handleKeyDown(modified)
      result.current.handleKeyDown(arrow)
      result.current.handleKeyDown(space)
    })

    expect(result.current.typed).toBe(' ')
    expect(result.current.totalKeystrokes).toBe(1)
    expect(modified.preventDefault).not.toHaveBeenCalled()
    expect(arrow.preventDefault).not.toHaveBeenCalled()
    expect(space.preventDefault).toHaveBeenCalledOnce()

    const backspace = keyboardEvent('Backspace')
    act(() => {
      result.current.handleKeyDown(backspace)
    })
    expect(backspace.preventDefault).toHaveBeenCalledOnce()
    expect(result.current.typed).toBe('')
    expect(result.current.totalKeystrokes).toBe(1)
  })

  it('resets the same passage and resets when the target changes', () => {
    const { result, rerender } = renderHook(
      ({ target }: { target: string }) => useTypingTest(target),
      { initialProps: { target: 'abc' } },
    )

    act(() => {
      result.current.handleKeyDown(keyboardEvent('a'))
      result.current.reset()
    })
    expect(result.current.typed).toBe('')
    expect(result.current.status).toBe('idle')

    act(() => {
      result.current.handleKeyDown(keyboardEvent('a'))
    })
    rerender({ target: 'xyz' })

    expect(result.current.target).toBe('xyz')
    expect(result.current.typed).toBe('')
    expect(result.current.status).toBe('idle')
  })
})
