type SearchBarProps = {
  query: string
  onQueryChange: (query: string) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  activeOptionId?: string
  hasSuggestions: boolean
}

export function SearchBar({
  query,
  onQueryChange,
  onKeyDown,
  activeOptionId,
  hasSuggestions,
}: SearchBarProps) {
  return (
    <label className="search-bar">
      <span className="sr-only">Search Wikipedia topics</span>
      <input
        autoComplete="off"
        autoFocus
        aria-activedescendant={activeOptionId}
        aria-autocomplete="list"
        aria-controls="wiki-suggestions"
        aria-expanded={hasSuggestions}
        name="topic"
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="What are you interested in?"
        role="combobox"
        type="search"
        value={query}
      />
    </label>
  )
}
