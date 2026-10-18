type SearchBarProps = {
  query: string
  onQueryChange: (query: string) => void
}

export function SearchBar({ query, onQueryChange }: SearchBarProps) {
  return (
    <label className="search-bar">
      <span className="sr-only">Search Wikipedia topics</span>
      <input
        autoComplete="off"
        autoFocus
        name="topic"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="What are you interested in?"
        type="search"
        value={query}
      />
    </label>
  )
}
