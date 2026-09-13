import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/page-header'
import { ListShell } from '@/components/common/list-shell'
import { TripFormSheet } from '@/components/trips/trip-form-sheet'
import { FilterSelect } from '@/components/common/filter-select'
import { NeedsCompany } from '@/components/common/needs-company'
import { StatusBadge } from '@/components/common/status-badge'
import { useListState } from '@/hooks/use-list-state'
import { useCompany } from '@/hooks/use-company'
import { shipments, trips } from '@/hooks/use-resources'
import { formatDateTime, formatMoney, formatNumber } from '@/lib/format'
import { TRIP_STATUSES, type Trip, type TripStatus } from '@/types/api'
import type { Columns } from '@/components/common/data-table'

export function TripsPage() {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const listState = useListState()
  const [status, setStatus] = useState<string | null>(null)
  const [editing, setEditing] = useState<Trip | null>(null)
  const [open, setOpen] = useState(false)

  // Trips are filtered by company through their shipment, so the visible set is
  // the trips whose shipment belongs to the selected company.
  const shipmentList = shipments.useList({ companyId, pageSize: 200 }, Boolean(companyId))

  const shipmentIds = useMemo(
    () => new Set((shipmentList.data?.items ?? []).map((s) => s.id)),
    [shipmentList.data],
  )

  const query = trips.useList(
    { status, page: listState.page, pageSize: listState.pageSize },
    Boolean(companyId),
  )

  const scoped = useMemo(() => {
    if (!query.data) return query
    return {
      ...query,
      data: {
        ...query.data,
        items: query.data.items.filter((t) => shipmentIds.has(t.shipmentId)),
      },
    }
  }, [query, shipmentIds])

  function openCreate() {
    setEditing(null)
    setOpen(true)
  }

  const columns: Columns<Trip> = [
    {
      accessorKey: 'shipmentReference',
      header: 'Shipment',
      cell: (c) => <span className="font-medium tabular-nums">{c.getValue<string | null>() ?? '—'}</span>,
    },
    { accessorKey: 'driverName', header: 'Driver', cell: (c) => c.getValue<string | null>() ?? '—' },
    {
      accessorKey: 'truckPlate',
      header: 'Truck',
      cell: (c) => <span className="tabular-nums">{c.getValue<string | null>() ?? '—'}</span>,
    },
    { accessorKey: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.getValue<TripStatus>()} /> },
    {
      accessorKey: 'startedAt',
      header: 'Started',
      cell: (c) => <span className="tabular-nums">{formatDateTime(c.getValue<string | null>())}</span>,
    },
    {
      accessorKey: 'completedAt',
      header: 'Completed',
      cell: (c) => <span className="tabular-nums">{formatDateTime(c.getValue<string | null>())}</span>,
    },
    {
      accessorKey: 'distanceKm',
      header: 'Distance',
      cell: (c) => <span className="tabular-nums">{formatNumber(c.getValue<number | null>(), ' km')}</span>,
    },
    {
      accessorKey: 'fuelCost',
      header: 'Fuel',
      cell: (c) => <span className="tabular-nums">{formatMoney(c.getValue<number | null>())}</span>,
    }
  ]

  if (!companyId) return <NeedsCompany />

  return (
    <>
      <PageHeader title="Trips" description="Each execution of a shipment by a driver and truck.">
        <Button onClick={openCreate}>
          <Plus className="size-4" /> New trip
        </Button>
      </PageHeader>

      <ListShell
        listState={listState}
        query={scoped}
        columns={columns}
        onRowClick={(trip) => navigate(`/trips/${trip.id}`)}
        emptyMessage="No trips match these filters."
        filters={
          <FilterSelect
            value={status}
            onChange={setStatus}
            options={TRIP_STATUSES}
            placeholder="Status"
            allLabel="All statuses"
          />
        }
      />

      <TripFormSheet
        open={open}
        onOpenChange={setOpen}
        trip={editing}
        companyId={companyId}
      />
    </>
  )
}
