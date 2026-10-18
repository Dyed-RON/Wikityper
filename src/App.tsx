import { useState } from 'react'
import { SearchBar } from './components/SearchBar'
import { SuggestionList } from './components/SuggestionList'
import { useWikiSearch } from './hooks/useWikiSearch'

type View = 'landing' | 'typing'

function App() {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [selectedTopic, setSelectedTopic] = useState('')
  const [view, setView] = useState<View>('landing')
  const { titles } = useWikiSearch(query)
  const visibleActiveIndex = Math.min(activeIndex, titles.length - 1)

  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery)
    setActiveIndex(-1)
  }

  const selectTopic = (topic: string) => {
    const normalizedTopic = topic.trim()
    if (!normalizedTopic) return

    setSelectedTopic(normalizedTopic)
    setView('typing')
  }

  if (view === 'typing') {
    return (
      <main
        aria-label={`Typing test for ${selectedTopic}`}
        className="typing-page page-enter"
      />
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
