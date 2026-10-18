import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResultsModal } from './ResultsModal'

afterEach(cleanup)

describe('ResultsModal', () => {
  it('shows final metrics, provides actions, and initially focuses Restart', () => {
    render(
      <ResultsModal
        accuracy={92}
        onNewTopic={vi.fn()}
        onRestart={vi.fn()}
        wpm={54}
      />,
    )

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByLabelText('Final words per minute')).toHaveTextContent(
      '54',
    )
    expect(screen.getByLabelText('Final accuracy')).toHaveTextContent('92%')
    expect(screen.getByRole('button', { name: 'Restart' })).toHaveFocus()
  })

  it('traps tab focus and maps Escape to New topic', () => {
    const onNewTopic = vi.fn()
    render(
      <ResultsModal
        accuracy={100}
        onNewTopic={onNewTopic}
        onRestart={vi.fn()}
        wpm={30}
      />,
    )
    const restart = screen.getByRole('button', { name: 'Restart' })
    const newTopic = screen.getByRole('button', { name: 'New topic' })

    fireEvent.keyDown(newTopic, { key: 'Tab' })
    expect(restart).toHaveFocus()

    fireEvent.keyDown(restart, { key: 'Tab', shiftKey: true })
    expect(newTopic).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onNewTopic).toHaveBeenCalledOnce()
  })

  it('calls each action when its button is activated', () => {
    const onRestart = vi.fn()
    const onNewTopic = vi.fn()
    render(
      <ResultsModal
        accuracy={100}
        onNewTopic={onNewTopic}
        onRestart={onRestart}
        wpm={30}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    fireEvent.click(screen.getByRole('button', { name: 'New topic' }))

    expect(onRestart).toHaveBeenCalledOnce()
    expect(onNewTopic).toHaveBeenCalledOnce()
  })
})
