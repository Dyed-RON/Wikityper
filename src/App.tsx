import { useState } from 'react'
import { SearchBar } from './components/SearchBar'

function App() {
  const [query, setQuery] = useState('')

  return (
    <main className="landing-page">
      <section className="landing-content" aria-labelledby="landing-title">
        <h1 id="landing-title">WikiType</h1>
        <p>Type Wikipedia, one introduction at a time.</p>
        <SearchBar query={query} onQueryChange={setQuery} />
      </section>
    </main>
  )
}

export default App
