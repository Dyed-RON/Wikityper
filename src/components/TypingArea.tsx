import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEventHandler,
} from 'react'
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
  const viewportRef = useRef<HTMLDivElement>(null)
  const caretRef = useRef<HTMLSpanElement>(null)
  const [scrollOffset, setScrollOffset] = useState(0)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const caret = caretRef.current
    if (!viewport || !caret) return

    const nextOffset = Math.max(
      0,
      caret.offsetTop - viewport.clientHeight / 3,
    )
    setScrollOffset((currentOffset) =>
      currentOffset === nextOffset ? currentOffset : nextOffset,
    )
  }, [typed.length])

  return (
    <section
      className="typing-area"
      aria-label="Typing passage"
      onClick={(event) => {
        const input = event.currentTarget.querySelector('input')
        input?.focus()
      }}
    >
      <div
        className="typing-passage-viewport"
        ref={viewportRef}
      >
        <div
          aria-hidden="true"
          className="typing-passage"
          style={{ transform: `translateY(-${scrollOffset}px)` }}
        >
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
                  <span className="typing-caret" ref={caretRef} />
                )}
                {character}
              </span>
            )
          })}
          {typed.length >= target.length && !disabled && (
            <span
              className="typing-caret typing-caret-end"
              ref={caretRef}
            />
          )}
        </div>
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
