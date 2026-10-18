import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TypingArea } from './TypingArea'

afterEach(cleanup)

describe('TypingArea', () => {
  it('renders each character as untyped, correct, or incorrect and shows the caret', () => {
    render(
      <TypingArea
        onKeyDown={vi.fn()}
        target="cat"
        typed="cx"
      />,
    )

    const passage = screen.getByLabelText('Typing passage')
    const characters = within(passage).getAllByText(/./)

    expect(characters[0]).toHaveAttribute('data-state', 'correct')
    expect(characters[1]).toHaveAttribute('data-state', 'incorrect')
    expect(characters[2]).toHaveAttribute('data-state', 'untyped')
    expect(passage.querySelectorAll('.typing-caret')).toHaveLength(1)
  })

  it('places the caret after the final character and hides it when disabled', () => {
    const { rerender } = render(
      <TypingArea onKeyDown={vi.fn()} target="ok" typed="ok" />,
    )

    expect(
      screen
        .getByLabelText('Typing passage')
        .querySelectorAll('.typing-caret'),
    ).toHaveLength(1)

    rerender(
      <TypingArea
        disabled
        onKeyDown={vi.fn()}
        target="ok"
        typed="ok"
      />,
    )

    expect(screen.getByLabelText('Typing input')).toBeDisabled()
    expect(screen.getByLabelText('Typing input')).toHaveAttribute(
      'tabindex',
      '-1',
    )
    expect(
      screen
        .getByLabelText('Typing passage')
        .querySelectorAll('.typing-caret'),
    ).toHaveLength(0)
  })

  it('captures keys on the focused hidden input and refocuses on passage click', () => {
    const onKeyDown = vi.fn()
    render(<TypingArea onKeyDown={onKeyDown} target="passage" typed="" />)
    const input = screen.getByLabelText('Typing input')

    expect(input).toHaveFocus()
    fireEvent.keyDown(input, { key: 'p' })
    expect(onKeyDown).toHaveBeenCalledOnce()

    input.blur()
    fireEvent.click(screen.getByLabelText('Typing passage'))
    expect(input).toHaveFocus()
  })
})
