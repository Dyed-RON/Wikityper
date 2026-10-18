import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  calculateAccuracy,
  calculateWpm,
  createInitialTypingState,
  TEST_DURATION_SECONDS,
  typingReducer,
} from '../lib/typingEngine'
import type { TypingState } from '../lib/typingEngine'

const INITIAL_PASSAGE_LENGTH = 450
const PASSAGE_EXTENSION_LENGTH = 360
const EXTEND_WHEN_REMAINING = 140

export interface TypingKeyboardEvent {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  isComposing?: boolean
  preventDefault(): void
}

export function useTypingTest(target: string) {
  const initialTarget = getInitialTarget(target)
  const sourceOffset = useRef(initialTarget.length)
  const [state, dispatch] = useReducer(
    typingReducer,
    initialTarget,
    createInitialTypingState,
  )

  useEffect(() => {
    const nextInitialTarget = getInitialTarget(target)
    sourceOffset.current = nextInitialTarget.length
    dispatch({ type: 'RESET', target: nextInitialTarget })
  }, [target])

  useEffect(() => {
    if (state.status !== 'running') return

    const intervalId = window.setInterval(() => {
      dispatch({ type: 'TICK', timestamp: Date.now() })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [state.status])

  const handleKeyDown = useCallback(
    (event: TypingKeyboardEvent) => {
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

      if (event.key === 'Backspace') {
        dispatch({ type: 'KEY', key: event.key, timestamp: Date.now() })
        return
      }

      if (event.key.length !== 1) return

      const nextTypedLength = state.typed.length + 1
      const charactersRemaining = state.target.length - nextTypedLength
      const extensionThreshold = Math.min(
        EXTEND_WHEN_REMAINING,
        Math.max(1, Math.floor(state.target.length * 0.2)),
      )
      if (charactersRemaining <= extensionThreshold) {
        const extension = getNextPassageChunk(target, sourceOffset.current)
        sourceOffset.current = extension.nextOffset
        dispatch({
          type: 'EXTEND',
          target: state.target + extension.text,
        })
      }

      dispatch({ type: 'KEY', key: event.key, timestamp: Date.now() })
    },
    [state.target, state.typed.length, target],
  )

  const reset = useCallback(() => {
    const nextInitialTarget = getInitialTarget(target)
    sourceOffset.current = nextInitialTarget.length
    dispatch({ type: 'RESET', target: nextInitialTarget })
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

function getInitialTarget(source: string): string {
  return source.slice(0, INITIAL_PASSAGE_LENGTH)
}

function getNextPassageChunk(
  source: string,
  offset: number,
): { text: string; nextOffset: number } {
  if (source.length === 0) {
    return { text: '', nextOffset: 0 }
  }

  let nextOffset = offset
  let text = ''

  while (text.length < PASSAGE_EXTENSION_LENGTH) {
    if (nextOffset >= source.length) {
      nextOffset = 0
      text += '\n\n'
    }

    const remainingLength = PASSAGE_EXTENSION_LENGTH - text.length
    const end = Math.min(nextOffset + remainingLength, source.length)
    text += source.slice(nextOffset, end)
    nextOffset = end
  }

  return {
    text,
    nextOffset,
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
