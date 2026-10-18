import { useEffect, useRef, useState } from 'react'
import { searchWikipedia } from '../lib/wikipedia'
import type { WikiSearchState } from '../types'
import { useDebounce } from './useDebounce'

type SearchState = WikiSearchState & { query: string | null }

const initialState: SearchState = {
  titles: [],
  status: 'idle',
  error: null,
  query: null,
}

export function useWikiSearch(query: string) {
  const debouncedQuery = useDebounce(query)
  const [state, setState] = useState(initialState)
  const activeController = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      activeController.current?.abort()
    },
    [query],
  )

  useEffect(() => {
    const normalizedQuery = debouncedQuery.trim()

    if (!normalizedQuery) return

    const controller = new AbortController()
    activeController.current = controller

    void searchWikipedia(normalizedQuery, controller.signal)
      .then((titles) => {
        if (controller.signal.aborted) return
        setState({ query: normalizedQuery, titles, status: 'success', error: null })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        setState({
          query: normalizedQuery,
          titles: [],
          status: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'Unable to search Wikipedia. Please try again.',
        })
      })

    return () => {
      controller.abort()
      if (activeController.current === controller) {
        activeController.current = null
      }
    }
  }, [debouncedQuery])

  const normalizedQuery = debouncedQuery.trim()
  const currentQuery = query.trim()
  const hasCurrentResult = state.query === normalizedQuery
  const status =
    !currentQuery
    ? 'idle'
    : currentQuery !== normalizedQuery
      ? 'loading'
    : hasCurrentResult
      ? state.status
      : 'loading'

  return {
    titles: status === 'success' && hasCurrentResult ? state.titles : [],
    status,
    error: status === 'error' && hasCurrentResult ? state.error : null,
    isLoading: status === 'loading',
    isEmpty:
      status === 'success' && hasCurrentResult && state.titles.length === 0,
  }
}
