import { useCallback, useEffect, useReducer } from 'react'
import {
  calculateAccuracy,
  calculateWpm,
  createInitialTypingState,
  TEST_DURATION_SECONDS,
  typingReducer,
} from '../lib/typingEngine'
import type { TypingState } from '../lib/typingEngine'

export interface TypingKeyboardEvent {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  isComposing?: boolean
  preventDefault(): void
}

export function useTypingTest(target: string) {
  const [state, dispatch] = useReducer(
    typingReducer,
    target,
    createInitialTypingState,
  )

  useEffect(() => {
    dispatch({ type: 'RESET', target })
  }, [target])

  useEffect(() => {
    if (state.status !== 'running') return

    const intervalId = window.setInterval(() => {
      dispatch({ type: 'TICK', timestamp: Date.now() })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [state.status])

  const handleKeyDown = useCallback((event: TypingKeyboardEvent) => {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.isComposing
    ) {
      return
    }

    if (event.key === ' ' || event.key === 'Backspace') {
      event.preventDefault()
    }

    if (event.key === 'Backspace' || event.key.length === 1) {
      dispatch({ type: 'KEY', key: event.key, timestamp: Date.now() })
    }
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET', target })
  }, [target])

  const elapsedSeconds = getElapsedSeconds(state)

  return {
    ...state,
    elapsedSeconds,
    wpm: calculateWpm(state.correctKeystrokes, elapsedSeconds),
    accuracy: calculateAccuracy(
      state.correctKeystrokes,
      state.totalKeystrokes,
    ),
    handleKeyDown,
    reset,
  }
}

function getElapsedSeconds(state: TypingState): number {
  if (state.startedAt === null) return 0

  if (state.status === 'running') {
    return TEST_DURATION_SECONDS - state.timeLeft
  }

  if (state.finishedAt === null) return 0
  const duration = Math.max(0, state.finishedAt - state.startedAt)
  return Math.min(TEST_DURATION_SECONDS, duration / 1000)
}
