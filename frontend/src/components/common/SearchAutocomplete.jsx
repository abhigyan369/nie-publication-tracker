import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

/**
 * Highlights the matching portion of a string.
 */
function HighlightMatch({ text = '', query = '' }) {
  if (!query.trim() || !text) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary font-semibold rounded-sm not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  )
}

const typeLabels = {
  JOURNAL_ARTICLE: 'Journal',
  CONFERENCE_PAPER: 'Conference',
  BOOK: 'Book',
  BOOK_CHAPTER: 'Book Chapter',
  REVIEW_ARTICLE: 'Review',
  CASE_STUDY: 'Case Study',
  SHORT_COMMUNICATION: 'Short Comm.',
  LETTER: 'Letter',
  EDITORIAL: 'Editorial',
}

/**
 * SearchAutocomplete
 * Props:
 *   value          — controlled input value
 *   onChange       — (val: string) => void  — called on every keystroke
 *   onSearch       — (val: string) => void  — called when Enter / suggestion clicked
 *   onClear        — () => void
 *   fetchSuggestions — async (q: string) => suggestion[]
 *   placeholder    — string
 *   debounceMs     — number (default 300)
 */
export function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  onClear,
  fetchSuggestions,
  placeholder = 'Search publications…',
  debounceMs = 300,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [fetching, setFetching] = useState(false)

  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const debounceTimer = useRef(null)
  const abortRef = useRef(null)

  // ── Outside-click closes dropdown ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setActiveIdx(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Debounced fetch ──────────────────────────────────────────────────────────
  const runFetch = useCallback(
    async (q) => {
      if (!q || q.trim().length < 2) {
        setSuggestions([])
        setOpen(false)
        return
      }

      // Cancel any in-flight request
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      setFetching(true)
      try {
        const results = await fetchSuggestions(q)
        setSuggestions(results ?? [])
        setOpen(true)
        setActiveIdx(-1)
      } catch {
        // AbortError or real error — silently ignore
        setSuggestions([])
      } finally {
        setFetching(false)
      }
    },
    [fetchSuggestions],
  )

  const handleInputChange = (e) => {
    const v = e.target.value
    onChange(v)
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => runFetch(v), debounceMs)
  }

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        onSearch(value)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIdx >= 0 && suggestions[activeIdx]) {
          selectSuggestion(suggestions[activeIdx])
        } else {
          onSearch(value)
          setOpen(false)
        }
        break
      case 'Escape':
        setOpen(false)
        setActiveIdx(-1)
        inputRef.current?.blur()
        break
    }
  }

  const selectSuggestion = (suggestion) => {
    onChange(suggestion.title)
    onSearch(suggestion.title)
    setOpen(false)
    setActiveIdx(-1)
    setSuggestions([])
  }

  const handleClear = () => {
    clearTimeout(debounceTimer.current)
    setSuggestions([])
    setOpen(false)
    setActiveIdx(-1)
    onClear()
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true)
          }}
          className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-10 py-2 text-sm
                     ring-offset-background placeholder:text-muted-foreground
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                     transition-all"
          autoComplete="off"
          spellCheck="false"
        />
        {/* Right icon: spinner or clear */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {fetching ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : value ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50
                     bg-popover border border-border rounded-lg shadow-xl shadow-black/10
                     overflow-hidden"
          role="listbox"
        >
          {suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              No publications found
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {suggestions.map((s, idx) => (
                <li
                  key={s.id}
                  role="option"
                  aria-selected={idx === activeIdx}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault() // prevent input blur before click
                    selectSuggestion(s)
                  }}
                  className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors
                    ${idx === activeIdx ? 'bg-accent' : 'hover:bg-accent/50'}`}
                >
                  {/* Type pill */}
                  <span className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
                    {typeLabels[s.publicationType] ?? s.publicationType}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground leading-tight">
                      <HighlightMatch text={s.title} query={value} />
                    </p>
                    {s.author && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <HighlightMatch
                          text={`${s.author.firstName} ${s.author.lastName}`}
                          query={value}
                        />
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchAutocomplete
