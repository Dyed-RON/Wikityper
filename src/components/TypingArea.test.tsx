import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TypingArea } from './TypingArea'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('TypingArea', () => {
  it('scrolls the passage to keep a later caret position in the viewport', () => {
    const getBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        if (this.classList.contains('typing-passage-viewport')) {
          return new DOMRect(0, 0, 0, 0)
        }

        if (this.classList.contains('typing-caret')) {
          const passage = this.closest<HTMLElement>('.typing-passage')
          const offset =
            Number(passage?.style.transform.match(/-([\d.]+)px/)?.[1]) || 0
          const top = this.parentElement?.textContent?.includes('y') ? 200 : 0
          return new DOMRect(0, top - offset, 0, 0)
        }

        return getBoundingClientRect.call(this)
      },
    )

    const { container, rerender } = render(
      <TypingArea onKeyDown={vi.fn()} target="xy" typed="" />,
    )
    const viewport = container.querySelector<HTMLDivElement>(
      '.typing-passage-viewport',
    )
    if (!viewport) throw new Error('Typing passage viewport was not rendered.')
    Object.defineProperty(viewport, 'clientHeight', { value: 120 })

    rerender(<TypingArea onKeyDown={vi.fn()} target="xy" typed="x" />)

    expect(container.querySelector('.typing-passage')).toHaveStyle({
      transform: 'translateY(-160px)',
    })
  })

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
