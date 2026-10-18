import type { KeyboardEventHandler } from 'react'
import './TypingPage.css'

interface TypingAreaProps {
  target: string
  typed: string
  disabled?: boolean
  onKeyDown: KeyboardEventHandler<HTMLInputElement>
}

export function TypingArea({
  target,
  typed,
  disabled = false,
  onKeyDown,
}: TypingAreaProps) {
  return (
    <section
      className="typing-area"
      aria-label="Typing passage"
      onClick={(event) => {
        const input = event.currentTarget.querySelector('input')
        input?.focus()
      }}
    >
      <div className="typing-passage" aria-hidden="true">
        {Array.from(target).map((character, index) => {
          const typedCharacter = typed[index]
          const state =
            typedCharacter === undefined
              ? 'untyped'
              : typedCharacter === character
                ? 'correct'
                : 'incorrect'

          return (
            <span
              className={`typing-character typing-character-${state}`}
              data-state={state}
              key={index}
            >
              {index === typed.length && !disabled && (
                <span className="typing-caret" />
              )}
              {character}
            </span>
          )
        })}
        {typed.length >= target.length && !disabled && (
          <span className="typing-caret typing-caret-end" />
        )}
      </div>
      <input
        aria-label="Typing input"
        autoCapitalize="off"
        autoComplete="off"
        autoFocus={!disabled}
        className="typing-input"
        disabled={disabled}
        onKeyDown={onKeyDown}
        readOnly
        spellCheck={false}
        tabIndex={disabled ? -1 : 0}
      />
    </section>
  )
}
