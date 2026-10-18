import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebounce } from './useDebounce'
import { useWikiSearch } from './useWikiSearch'

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  } as Response
}

async function advanceDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(200)
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useDebounce', () => {
  it('updates only after the delay and cancels the previous value', async () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 200),
      { initialProps: { value: 'initial' } },
    )

    rerender({ value: 'first' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    rerender({ value: 'latest' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(199)
    })
    expect(result.current).toBe('initial')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(result.current).toBe('latest')
  })
})

describe('useWikiSearch', () => {
  it('debounces a query and returns suggestions with loading and empty states', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(['query', ['Result'], [], []]))
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useWikiSearch(query),
      { initialProps: { query: '' } },
    )

    rerender({ query: 'topic' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(199)
    })
    expect(fetchMock).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(result.current).toMatchObject({
      titles: ['Result'],
      status: 'success',
      isLoading: false,
      isEmpty: false,
      error: null,
    })

    fetchMock.mockResolvedValueOnce(jsonResponse(['empty', [], [], []]))
    rerender({ query: 'empty' })
    await advanceDebounce()
    expect(result.current).toMatchObject({
      titles: [],
      status: 'success',
      isLoading: false,
      isEmpty: true,
    })
  })

  it('exposes request errors and does not search empty input', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network unavailable'))
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useWikiSearch(query),
      { initialProps: { query: '' } },
    )

    rerender({ query: 'failure' })
    await advanceDebounce()
    expect(result.current).toMatchObject({
      status: 'error',
      isLoading: false,
      error: 'Network unavailable',
    })

    rerender({ query: '   ' })
    await advanceDebounce()
    expect(result.current).toMatchObject({
      status: 'idle',
      titles: [],
      error: null,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('aborts stale requests and ignores their late responses', async () => {
    const pendingResponses: Array<(response: Response) => void> = []
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          pendingResponses.push(resolve)
        }),
    )
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useWikiSearch(query),
      { initialProps: { query: '' } },
    )

    rerender({ query: 'old' })
    await advanceDebounce()
    const oldSignal = fetchMock.mock.calls[0][1]?.signal

    rerender({ query: 'new' })
    expect(oldSignal?.aborted).toBe(true)
    expect(result.current.status).toBe('loading')
    await advanceDebounce()

    await act(async () => {
      pendingResponses[1](jsonResponse(['new', ['New result'], [], []]))
      await Promise.resolve()
    })
    await act(async () => {
      pendingResponses[0](jsonResponse(['old', ['Old result'], [], []]))
      await Promise.resolve()
    })

    expect(result.current.titles).toEqual(['New result'])
  })
})
