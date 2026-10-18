import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchIntro } from './lib/wikipedia'
import App from './App'

vi.mock('./lib/wikipedia', () => ({
  fetchIntro: vi.fn(),
  normalizeText: (text: string) => text,
  searchWikipedia: vi.fn().mockResolvedValue([]),
}))

const fetchIntroMock = vi.mocked(fetchIntro)

afterEach(cleanup)

beforeEach(() => {
  fetchIntroMock.mockReset()
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

  it('shows article loading after a query is submitted', () => {
    fetchIntroMock.mockReturnValue(new Promise(() => undefined))
    render(<App />)

    submitTopic()

    expect(screen.getByRole('status')).toHaveTextContent('Loading “Ada Lovelace”…')
  })

  it('shows an error with retry and new-topic actions', async () => {
    fetchIntroMock
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

  it('shows results on completion, restarts the same passage, and returns to landing', async () => {
    fetchIntroMock.mockResolvedValue('cat')
    render(<App />)

    submitTopic()
    const input = await screen.findByLabelText('Typing input')

    fireEvent.keyDown(input, { key: 'c' })
    fireEvent.keyDown(input, { key: 'a' })
    fireEvent.keyDown(input, { key: 't' })

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Final accuracy')).toHaveTextContent('100%')

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Typing input')).toHaveFocus()
    expect(screen.getByLabelText('Time remaining')).toHaveTextContent('30s')

    fireEvent.keyDown(screen.getByLabelText('Typing input'), { key: 'c' })
    fireEvent.keyDown(screen.getByLabelText('Typing input'), { key: 'a' })
    fireEvent.keyDown(screen.getByLabelText('Typing input'), { key: 't' })

    fireEvent.click(
      await screen.findByRole('button', { name: 'New topic' }),
    )
    expect(
      screen.getByPlaceholderText('What are you interested in?'),
    ).toBeInTheDocument()
  })
})
