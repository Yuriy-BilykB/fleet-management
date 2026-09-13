import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/page-header'
import { ListShell } from '@/components/common/list-shell'
import { ShipmentFormSheet } from '@/components/shipments/shipment-form-sheet'
import { FilterSelect } from '@/components/common/filter-select'
import { NeedsCompany } from '@/components/common/needs-company'
import { StatusBadge } from '@/components/common/status-badge'
import { useListState } from '@/hooks/use-list-state'
import { useCompany } from '@/hooks/use-company'
import { shipments } from '@/hooks/use-resources'
import { formatDateTime, formatMoney, formatNumber } from '@/lib/format'
import { SHIPMENT_STATUSES, type Shipment, type ShipmentStatus } from '@/types/api'
import type { Columns } from '@/components/common/data-table'

export function ShipmentsPage() {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const listState = useListState()
  const [status, setStatus] = useState<string | null>(null)
  const [editing, setEditing] = useState<Shipment | null>(null)
  const [open, setOpen] = useState(false)

  const query = shipments.useList(
    { companyId, status, page: listState.page, pageSize: listState.pageSize, search: listState.debouncedSearch },
    Boolean(companyId),
  )

  function openCreate() {
    setEditing(null)
    setOpen(true)
  }

  const columns: Columns<Shipment> = [
    {
      accessorKey: 'reference',
      header: 'Ref',
      cell: (c) => <span className="font-medium tabular-nums">{c.getValue<string>()}</span>,
    },
    { accessorKey: 'customerName', header: 'Customer', cell: (c) => c.getValue<string | null>() ?? '—' },
    {
      id: 'route',
      header: 'Route',
      accessorFn: (row) => `${row.originAddress} → ${row.destinationAddress}`,
      cell: (c) => (
        <div className="max-w-[260px] truncate" title={c.getValue<string>()}>
          {c.getValue<string>()}
        </div>
      ),
    },
    {
      accessorKey: 'cargoDescription',
      header: 'Cargo',
      cell: (c) => (
        <div className="text-muted-foreground max-w-[180px] truncate" title={c.getValue<string>()}>
          {c.getValue<string>()}
        </div>
      ),
    },
    {
      accessorKey: 'weightKg',
      header: 'Weight',
      cell: (c) => <span className="tabular-nums">{formatNumber(c.getValue<number>(), ' kg')}</span>,
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: (c) => (
        <span className="tabular-nums">
          {formatMoney(c.getValue<number | null>(), c.row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'pickupDate',
      header: 'Pickup',
      cell: (c) => <span className="tabular-nums">{formatDateTime(c.getValue<string>())}</span>,
    },
    { accessorKey: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.getValue<ShipmentStatus>()} /> }
  ]

  if (!companyId) return <NeedsCompany />

  return (
    <>
      <PageHeader title="Shipments" description="Customer orders to move cargo from A to B.">
        <Button onClick={openCreate}>
          <Plus className="size-4" /> New shipment
        </Button>
      </PageHeader>

      <ListShell
        listState={listState}
        query={query}
        columns={columns}
        onRowClick={(shipment) => navigate(`/shipments/${shipment.id}`)}
        searchPlaceholder="Search reference, route or cargo…"
        emptyMessage="No shipments match these filters."
        filters={
          <FilterSelect
            value={status}
            onChange={setStatus}
            options={SHIPMENT_STATUSES}
            placeholder="Status"
            allLabel="All statuses"
          />
        }
      />

      <ShipmentFormSheet
        open={open}
        onOpenChange={setOpen}
        shipment={editing}
        companyId={companyId}
      />

    </>
  )
}
