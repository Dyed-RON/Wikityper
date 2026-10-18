type SuggestionListProps = {
  titles: string[]
  activeIndex: number
  onSelect: (title: string) => void
}

export function SuggestionList({
  titles,
  activeIndex,
  onSelect,
}: SuggestionListProps) {
  if (titles.length === 0) return null

  return (
    <ul className="suggestion-list" id="wiki-suggestions" role="listbox">
      {titles.map((title, index) => {
        const isActive = index === activeIndex
        const optionId = `wiki-suggestion-${index}`

        return (
          <li
            aria-selected={isActive}
            className={isActive ? 'is-active' : undefined}
            id={optionId}
            key={title}
            onMouseDown={(event) => {
              event.preventDefault()
              onSelect(title)
            }}
            role="option"
          >
            {title}
          </li>
        )
      })}
    </ul>
  )
}
