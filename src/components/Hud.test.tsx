import { render, screen } from '@testing-library/react'
import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Hud } from './Hud'

afterEach(cleanup)

describe('Hud', () => {
  it('shows WPM, countdown beneath it, and accuracy', () => {
    render(<Hud wpm={42} timeLeft={17} accuracy={86} />)

    expect(screen.getByLabelText('Words per minute')).toHaveTextContent('42')
    expect(screen.getByLabelText('Time remaining')).toHaveTextContent('17s')
    expect(screen.getByLabelText('Accuracy')).toHaveTextContent('86%')
    expect(screen.getByText('WPM')).toBeInTheDocument()
    expect(screen.getByText('Accuracy')).toBeInTheDocument()
  })

  it('renders zero values without hiding metrics', () => {
    render(<Hud wpm={0} timeLeft={0} accuracy={100} />)

    expect(screen.getByLabelText('Words per minute')).toHaveTextContent('0')
    expect(screen.getByLabelText('Time remaining')).toHaveTextContent('0s')
    expect(screen.getByLabelText('Accuracy')).toHaveTextContent('100%')
  })
})
