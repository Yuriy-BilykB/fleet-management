import type { ReactNode } from 'react'
import { Loader2, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DataTable, type Columns } from '@/components/common/data-table'
import { Pagination } from '@/components/common/pagination'
import type { ListState } from '@/hooks/use-list-state'
import type { RowData } from '@tanstack/react-table'
import type { Paged } from '@/types/api'

interface ListShellProps<T extends RowData> {
  state: ListState
  query: { data?: Paged<T>; isLoading: boolean; isError: boolean; error: unknown }
  columns: Columns<T>
  searchPlaceholder?: string
  emptyMessage?: string
  filters?: ReactNode
}

export function ListShell<T extends RowData>({
  state, query, columns, searchPlaceholder, emptyMessage, filters,
}: ListShellProps<T>) {
  const page = query.data

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        {searchPlaceholder && (
          <div className="relative min-w-[220px] flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              value={state.search}
              onChange={(e) => state.setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  state.submitSearch()
                }
              }}
              placeholder={searchPlaceholder}
              className="ps-9 pe-9"
            />
            {state.isSearching && (
              <Loader2 className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin" />
            )}
          </div>
        )}
        {filters}
      </div>

      {query.isError ? (
        <div className="text-destructive p-6 text-sm">
          Could not load data: {query.error instanceof Error ? query.error.message : 'unknown error'}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={page?.items ?? []}
          isLoading={query.isLoading}
          emptyMessage={emptyMessage}
        />
      )}

      <Pagination
        page={page?.page ?? state.page}
        pageSize={page?.pageSize ?? state.pageSize}
        total={page?.total ?? 0}
        totalPages={page?.totalPages ?? 0}
        onPageChange={state.setPage}
        onPageSizeChange={state.setPageSize}
      />
    </Card>
  )
}
