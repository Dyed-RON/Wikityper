import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

describe('App', () => {
  it('renders the landing-page topic search', () => {
    render(<App />)

    expect(
      screen.getByPlaceholderText('What are you interested in?'),
    ).toBeInTheDocument()
  })

  it('switches to the typing view when a query is submitted', () => {
    render(<App />)
    const input = screen.getByPlaceholderText('What are you interested in?')

    fireEvent.change(input, { target: { value: 'Ada Lovelace' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(
      screen.getByRole('main', { name: 'Typing test for Ada Lovelace' }),
    ).toBeInTheDocument()
  })
})
