import './TypingPage.css'

interface HudProps {
  wpm: number
  timeLeft: number
  accuracy: number
}

export function Hud({ wpm, timeLeft, accuracy }: HudProps) {
  return (
    <section className="typing-hud" aria-label="Typing test statistics">
      <div className="typing-hud-group typing-hud-primary">
        <div className="typing-hud-metric">
          <span className="typing-hud-label">WPM</span>
          <output aria-label="Words per minute">{wpm}</output>
        </div>
        <output className="typing-hud-timer" aria-label="Time remaining">
          {timeLeft}s
        </output>
      </div>
      <div className="typing-hud-group typing-hud-secondary">
        <span className="typing-hud-label">Accuracy</span>
        <output aria-label="Accuracy">{accuracy}%</output>
      </div>
    </section>
  )
}
