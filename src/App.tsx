import { useEffect, useState } from 'react'
import { Hud } from './components/Hud'
import { ResultsModal } from './components/ResultsModal'
import { SearchBar } from './components/SearchBar'
import { SuggestionList } from './components/SuggestionList'
import { TypingArea } from './components/TypingArea'
import { useTypingTest } from './hooks/useTypingTest'
import { useWikiSearch } from './hooks/useWikiSearch'
import { fetchIntro, normalizeText } from './lib/wikipedia'

type View = 'landing' | 'typing'

type ArticleState =
  | { status: 'idle' | 'loading'; text: null; error: null }
  | { status: 'ready'; text: string; error: null }
  | { status: 'error'; text: null; error: string }

const initialArticleState: ArticleState = {
  status: 'idle',
  text: null,
  error: null,
}

function App() {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [selectedTopic, setSelectedTopic] = useState('')
  const [view, setView] = useState<View>('landing')
  const [article, setArticle] = useState<ArticleState>(initialArticleState)
  const [attempt, setAttempt] = useState(0)
  const { titles } = useWikiSearch(query)
  const typingTest = useTypingTest(article.text ?? '')
  const visibleActiveIndex = Math.min(activeIndex, titles.length - 1)

  useEffect(() => {
    if (view !== 'typing' || !selectedTopic) return

    const controller = new AbortController()

    void fetchIntro(selectedTopic, controller.signal)
      .then((intro) => {
        if (controller.signal.aborted) return

        const text = normalizeText(intro)
        if (!text) throw new Error('This article has no text to type.')
        setArticle({ status: 'ready', text, error: null })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setArticle({
          status: 'error',
          text: null,
          error:
            error instanceof Error
              ? error.message
              : 'Unable to load this article. Please try again.',
        })
      })

    return () => controller.abort()
  }, [attempt, selectedTopic, view])

  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery)
    setActiveIndex(-1)
  }

  const selectTopic = (topic: string) => {
    const normalizedTopic = topic.trim()
    if (!normalizedTopic) return

    setSelectedTopic(normalizedTopic)
    setArticle({ status: 'loading', text: null, error: null })
    setView('typing')
    setAttempt(0)
  }

  const returnToLanding = () => {
    setArticle(initialArticleState)
    setSelectedTopic('')
    setQuery('')
    setActiveIndex(-1)
    setView('landing')
  }

  if (view === 'typing') {
    return (
      <main
        aria-label={`Typing test for ${selectedTopic}`}
        className="typing-page page-enter"
      >
        {article.status === 'loading' || article.status === 'idle' ? (
          <section className="article-state" role="status">
            <p>Loading “{selectedTopic}”…</p>
          </section>
        ) : null}

        {article.status === 'error' ? (
          <section className="article-state" role="alert">
            <p>We couldn’t load “{selectedTopic}”.</p>
            <p className="article-state-detail">{article.error}</p>
            <div className="article-state-actions">
              <button
                onClick={() => {
                  setArticle({ status: 'loading', text: null, error: null })
                  setAttempt((value) => value + 1)
                }}
                type="button"
              >
                Retry
              </button>
              <button onClick={returnToLanding} type="button">
                New topic
              </button>
            </div>
          </section>
        ) : null}

        {article.status === 'ready' && article.text ? (
          <>
            <Hud
              accuracy={typingTest.accuracy}
              timeLeft={typingTest.timeLeft}
              wpm={typingTest.wpm}
            />
            <TypingArea
              disabled={typingTest.status === 'finished'}
              onKeyDown={typingTest.handleKeyDown}
              target={article.text}
              typed={typingTest.typed}
            />
            {typingTest.status === 'finished' ? (
              <ResultsModal
                accuracy={typingTest.accuracy}
                onNewTopic={returnToLanding}
                onRestart={typingTest.reset}
                wpm={typingTest.wpm}
              />
            ) : null}
          </>
        ) : null}
      </main>
    )
  }

  return (
    <main className="landing-page page-enter">
      <section className="landing-content" aria-labelledby="landing-title">
        <h1 id="landing-title">WikiType</h1>
        <p>Type Wikipedia, one introduction at a time.</p>
        <div className="search-shell">
          <SearchBar
            activeOptionId={
              visibleActiveIndex >= 0
                ? `wiki-suggestion-${visibleActiveIndex}`
                : undefined
            }
            hasSuggestions={titles.length > 0}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                selectTopic(titles[visibleActiveIndex] ?? query)
                return
              }

              if (titles.length === 0) return

              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActiveIndex((index) => (index + 1) % titles.length)
              }

              if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActiveIndex((index) =>
                  index <= 0 ? titles.length - 1 : index - 1,
                )
              }
            }}
            onQueryChange={updateQuery}
            query={query}
          />
          <SuggestionList
            activeIndex={visibleActiveIndex}
            onSelect={selectTopic}
            titles={titles}
          />
        </div>
      </section>
    </main>
  )
}

export default App
