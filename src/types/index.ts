export type WikiSearchStatus = 'idle' | 'loading' | 'success' | 'error'

export interface WikiSearchState {
  titles: string[]
  status: WikiSearchStatus
  error: string | null
}
