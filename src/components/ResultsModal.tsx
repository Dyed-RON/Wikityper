import { useEffect, useRef, type KeyboardEvent } from 'react'
import './TypingPage.css'

interface ResultsModalProps {
  wpm: number
  accuracy: number
  onRestart: () => void
  onNewTopic: () => void
}

export function ResultsModal({
  wpm,
  accuracy,
  onRestart,
  onNewTopic,
}: ResultsModalProps) {
  const restartButtonRef = useRef<HTMLButtonElement>(null)
  const newTopicButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    restartButtonRef.current?.focus()
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onNewTopic()
      return
    }

    if (event.key !== 'Tab') return

    const firstButton = restartButtonRef.current
    const lastButton = newTopicButtonRef.current
    if (!firstButton || !lastButton) return

    if (event.shiftKey && document.activeElement === firstButton) {
      event.preventDefault()
      lastButton.focus()
    } else if (!event.shiftKey && document.activeElement === lastButton) {
      event.preventDefault()
      firstButton.focus()
    }
  }

  return (
    <div className="results-backdrop">
      <section
        aria-labelledby="results-title"
        aria-modal="true"
        className="results-dialog"
        onKeyDown={handleKeyDown}
        role="dialog"
      >
        <p className="results-eyebrow">Test complete</p>
        <h2 id="results-title">Your results</h2>
        <div className="results-metrics">
          <div>
            <span>WPM</span>
            <output aria-label="Final words per minute">{wpm}</output>
          </div>
          <div>
            <span>Accuracy</span>
            <output aria-label="Final accuracy">{accuracy}%</output>
          </div>
        </div>
        <div className="results-actions">
          <button
            onClick={onRestart}
            ref={restartButtonRef}
            type="button"
          >
            Restart
          </button>
          <button
            className="results-secondary"
            onClick={onNewTopic}
            ref={newTopicButtonRef}
            type="button"
          >
            New topic
          </button>
        </div>
      </section>
    </div>
  )
}
