import { useState } from 'react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

export interface ListState {
  page: number
  pageSize: number
  search: string
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSearch: (search: string) => void
  /** Debounced copy of `search`, safe to put straight into a query key. */
  debouncedSearch: string
  /** True while `debouncedSearch` is still catching up with `search`. */
  isSearching: boolean
  /** Runs the pending search now — for Enter, or a search button. */
  submitSearch: () => void
}

/**
 * Page / page-size / search state shared by every list page, plus the rule that
 * changing a filter sends you back to page 1 — without it a narrowed result set
 * leaves you on a page that no longer exists.
 */
export function useListState(initialPageSize = 25): ListState {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeRaw] = useState(initialPageSize)
  const [search, setSearchRaw] = useState('')

  const debounced = useDebouncedValue(search)

  return {
    page,
    pageSize,
    search,
    debouncedSearch: debounced.value,
    isSearching: debounced.isPending,
    submitSearch: debounced.flush,
    setPage,
    setPageSize: (size) => {
      setPageSizeRaw(size)
      setPage(1)
    },
    setSearch: (value) => {
      setSearchRaw(value)
      setPage(1)
    },
  }
}
