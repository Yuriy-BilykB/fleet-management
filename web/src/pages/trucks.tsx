import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/page-header'
import { ListShell } from '@/components/common/list-shell'
import { TruckFormSheet } from '@/components/trucks/truck-form-sheet'
import { FilterSelect } from '@/components/common/filter-select'
import { NeedsCompany } from '@/components/common/needs-company'
import { StatusBadge } from '@/components/common/status-badge'
import { useListState } from '@/hooks/use-list-state'
import { useCompany } from '@/hooks/use-company'
import { trucks } from '@/hooks/use-resources'
import { formatDate, formatNumber } from '@/lib/format'
import { TRUCK_STATUSES, type Truck, type TruckStatus } from '@/types/api'
import type { Columns } from '@/components/common/data-table'

export function TrucksPage() {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const listState = useListState()
  const [status, setStatus] = useState<string | null>(null)
  const [editing, setEditing] = useState<Truck | null>(null)
  const [open, setOpen] = useState(false)

  const query = trucks.useList(
    { companyId, status, page: listState.page, pageSize: listState.pageSize, search: listState.debouncedSearch },
    Boolean(companyId),
  )

  function openCreate() {
    setEditing(null)
    setOpen(true)
  }

  const columns: Columns<Truck> = [
    {
      accessorKey: 'plateNumber',
      header: 'Plate',
      cell: (c) => <span className="font-medium tabular-nums">{c.getValue<string>()}</span>,
    },
    {
      id: 'vehicle',
      header: 'Vehicle',
      accessorFn: (row) => `${row.make} ${row.model}`,
      cell: (c) => (
        <div>
          <div>{c.getValue<string>()}</div>
          {c.row.original.year && (
            <div className="text-muted-foreground text-xs">{c.row.original.year}</div>
          )}
        </div>
      ),
    },
    { accessorKey: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.getValue<TruckStatus>()} /> },
    {
      accessorKey: 'capacityKg',
      header: 'Capacity',
      cell: (c) => <span className="tabular-nums">{formatNumber(c.getValue<number>(), ' kg')}</span>,
    },
    {
      accessorKey: 'odometerKm',
      header: 'Odometer',
      cell: (c) => <span className="tabular-nums">{formatNumber(c.getValue<number>(), ' km')}</span>,
    },
    {
      accessorKey: 'insuranceExpiry',
      header: 'Insurance',
      cell: (c) => <ExpiryCell value={c.getValue<string | null>()} />,
    },
    {
      accessorKey: 'inspectionExpiry',
      header: 'Inspection',
      cell: (c) => <ExpiryCell value={c.getValue<string | null>()} />,
    }
  ]

  if (!companyId) return <NeedsCompany />

  return (
    <>
      <PageHeader title="Trucks" description="The vehicles in your fleet.">
        <Button onClick={openCreate}>
          <Plus className="size-4" /> New truck
        </Button>
      </PageHeader>

      <ListShell
        listState={listState}
        query={query}
        columns={columns}
        onRowClick={(truck) => navigate(`/trucks/${truck.id}`)}
        searchPlaceholder="Search plate, make or model…"
        emptyMessage="No trucks match these filters."
        filters={
          <FilterSelect
            value={status}
            onChange={setStatus}
            options={TRUCK_STATUSES}
            placeholder="Status"
            allLabel="All statuses"
          />
        }
      />

      <TruckFormSheet
        open={open}
        onOpenChange={setOpen}
        truck={editing}
        companyId={companyId}
      />
    </>
  )
}

/** Highlights a date that has passed or falls within the next 30 days. */
function ExpiryCell({ value }: { value: string | null }) {
  // Read the clock once on mount so re-renders cannot shift the countdown.
  const [now] = useState(() => Date.now())
  if (!value) return <span className="text-muted-foreground">—</span>

  const days = Math.ceil((new Date(value).getTime() - now) / 86_400_000)
  const tone =
    days < 0 ? 'text-red-600 dark:text-red-400 font-medium'
    : days <= 30 ? 'text-amber-600 dark:text-amber-400 font-medium'
    : ''

  return (
    <span className={tone}>
      {formatDate(value)}
      {days < 0 && ' · expired'}
      {days >= 0 && days <= 30 && ` · ${days}d`}
    </span>
  )
}
