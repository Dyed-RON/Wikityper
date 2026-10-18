import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchTypingPassage } from './lib/wikipedia'
import App from './App'

vi.mock('./lib/wikipedia', () => ({
  fetchTypingPassage: vi.fn(),
  normalizeText: (text: string) => text,
  searchWikipedia: vi.fn().mockResolvedValue([]),
}))

const fetchTypingPassageMock = vi.mocked(fetchTypingPassage)

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

beforeEach(() => {
  fetchTypingPassageMock.mockReset()
})

function submitTopic(topic = 'Ada Lovelace') {
  const input = screen.getByPlaceholderText('What are you interested in?')
  fireEvent.change(input, { target: { value: topic } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

describe('App', () => {
  it('renders the landing-page topic search', () => {
    render(<App />)

    const searchInput = screen.getByPlaceholderText(
      'What are you interested in?',
    )
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveValue('')
  })

  it('shows a no-results state when the search returns no topics', async () => {
    render(<App />)

    fireEvent.change(screen.getByPlaceholderText('What are you interested in?'), {
      target: { value: 'unknown topic' },
    })

    expect(await screen.findByRole('status')).toHaveTextContent('No results')
  })

  it('shows article loading after a query is submitted', () => {
    fetchTypingPassageMock.mockReturnValue(new Promise(() => undefined))
    render(<App />)

    submitTopic()

    expect(screen.getByRole('status')).toHaveTextContent('Loading “Ada Lovelace”…')
  })

  it('shows an error with retry and new-topic actions', async () => {
    fetchTypingPassageMock
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce('Ada Lovelace was an English mathematician.')
    render(<App />)

    submitTopic()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Network unavailable',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByLabelText('Typing input')).toBeInTheDocument()
  })

  it('shows results when time expires, restarts the same passage, and returns to landing', async () => {
    fetchTypingPassageMock.mockResolvedValue('c'.repeat(800))
    render(<App />)

    submitTopic()
    const input = await screen.findByLabelText('Typing input')

    vi.useFakeTimers()
    fireEvent.keyDown(input, { key: 'c' })
    const firstCharacter = screen
      .getByLabelText('Typing passage')
      .querySelector('.typing-character')
    expect(firstCharacter).toHaveTextContent('c')
    expect(firstCharacter).toHaveAttribute('data-state', 'correct')
    expect(screen.getByLabelText('Accuracy')).toHaveTextContent('100%')
    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Final accuracy')).toHaveTextContent('100%')

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Typing input')).toHaveFocus()
    expect(screen.getByLabelText('Time remaining')).toHaveTextContent('30s')

    fireEvent.keyDown(screen.getByLabelText('Typing input'), { key: 'c' })
    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    fireEvent.click(screen.getByRole('button', { name: 'New topic' }))
    expect(
      screen.getByPlaceholderText('What are you interested in?'),
    ).toBeInTheDocument()
  })
})
