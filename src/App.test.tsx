import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the landing-page topic search', () => {
    render(<App />)

    expect(
      screen.getByPlaceholderText('What are you interested in?'),
    ).toBeInTheDocument()
  })
})
