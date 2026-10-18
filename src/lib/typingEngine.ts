export const TEST_DURATION_SECONDS = 30

export type TypingStatus = 'idle' | 'running' | 'finished'

export interface TypingState {
  target: string
  typed: string
  status: TypingStatus
  startedAt: number | null
  finishedAt: number | null
  timeLeft: number
  correctKeystrokes: number
  totalKeystrokes: number
}

export type TypingAction =
  | { type: 'KEY'; key: string; timestamp: number }
  | { type: 'TICK'; timestamp: number }
  | { type: 'EXTEND'; target: string }
  | { type: 'RESET'; target: string }

export function createInitialTypingState(target: string): TypingState {
  return {
    target,
    typed: '',
    status: target.length === 0 ? 'finished' : 'idle',
    startedAt: null,
    finishedAt: target.length === 0 ? 0 : null,
    timeLeft: TEST_DURATION_SECONDS,
    correctKeystrokes: 0,
    totalKeystrokes: 0,
  }
}

export function calculateWpm(
  correctChars: number,
  elapsedSeconds: number,
): number {
  const elapsedMinutes = Math.max(elapsedSeconds, 1) / 60
  return Math.round(correctChars / 5 / elapsedMinutes)
}

export function calculateAccuracy(
  correctKeystrokes: number,
  totalKeystrokes: number,
): number {
  if (totalKeystrokes === 0) return 100
  return Math.round((correctKeystrokes / totalKeystrokes) * 100)
}

export function typingReducer(
  state: TypingState,
  action: TypingAction,
): TypingState {
  if (action.type === 'RESET') {
    return createInitialTypingState(action.target)
  }

  if (action.type === 'EXTEND') {
    if (state.status === 'finished') return state
    return { ...state, target: action.target }
  }

  if (state.status === 'finished') return state

  if (action.type === 'TICK') {
    if (state.status !== 'running' || state.startedAt === null) return state

    const elapsedMs = Math.max(0, action.timestamp - state.startedAt)
    const timeLeft = Math.max(
      0,
      Math.ceil((TEST_DURATION_SECONDS * 1000 - elapsedMs) / 1000),
    )

    if (timeLeft === 0) {
      return {
        ...state,
        status: 'finished',
        finishedAt: action.timestamp,
        timeLeft: 0,
      }
    }

    return { ...state, timeLeft }
  }

  if (action.key === 'Backspace') {
    if (state.typed.length === 0) return state
    return { ...state, typed: state.typed.slice(0, -1) }
  }

  if (action.key.length !== 1 || state.typed.length >= state.target.length) {
    return state
  }

  const typed = state.typed + action.key
  const startedAt = state.startedAt ?? action.timestamp
  const finished = typed.length === state.target.length

  return {
    ...state,
    typed,
    status: finished ? 'finished' : 'running',
    startedAt,
    finishedAt: finished ? action.timestamp : null,
    correctKeystrokes:
      state.correctKeystrokes +
      Number(action.key === state.target[state.typed.length]),
    totalKeystrokes: state.totalKeystrokes + 1,
  }
}
