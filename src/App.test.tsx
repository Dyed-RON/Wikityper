import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchIntro } from './lib/wikipedia'
import App from './App'

vi.mock('./lib/wikipedia', () => ({
  fetchIntro: vi.fn(),
  normalizeText: (text: string) => text,
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

    expect(
      screen.getByPlaceholderText('What are you interested in?'),
    ).toBeInTheDocument()
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
})
