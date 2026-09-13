import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/page-header'
import { ListShell } from '@/components/common/list-shell'
import { DriverFormSheet } from '@/components/drivers/driver-form-sheet'
import { FilterSelect } from '@/components/common/filter-select'
import { NeedsCompany } from '@/components/common/needs-company'
import { StatusBadge } from '@/components/common/status-badge'
import { useListState } from '@/hooks/use-list-state'
import { useCompany } from '@/hooks/use-company'
import { drivers } from '@/hooks/use-resources'
import { formatDate } from '@/lib/format'
import { DRIVER_STATUSES, type Driver, type DriverStatus } from '@/types/api'
import type { Columns } from '@/components/common/data-table'

export function DriversPage() {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const listState = useListState()
  const [status, setStatus] = useState<string | null>(null)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [open, setOpen] = useState(false)

  const query = drivers.useList(
    { companyId, status, page: listState.page, pageSize: listState.pageSize, search: listState.debouncedSearch },
    Boolean(companyId),
  )

  function openCreate() {
    setEditing(null)
    setOpen(true)
  }

  const columns: Columns<Driver> = [
    {
      id: 'name',
      header: 'Driver',
      accessorFn: (row) => `${row.lastName} ${row.firstName}`,
      cell: (c) => (
        <div>
          <div className="font-medium">
            {c.row.original.lastName} {c.row.original.firstName}
          </div>
          {c.row.original.phone && (
            <div className="text-muted-foreground text-xs">{c.row.original.phone}</div>
          )}
        </div>
      ),
    },
    { accessorKey: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.getValue<DriverStatus>()} /> },
    {
      accessorKey: 'assignedTruckPlate',
      header: 'Assigned truck',
      cell: (c) =>
        c.getValue<string | null>() ?? <span className="text-muted-foreground">unassigned</span>,
    },
    { accessorKey: 'licenseNumber', header: 'License' },
    {
      accessorKey: 'licenseExpiry',
      header: 'License expires',
      cell: (c) => formatDate(c.getValue<string | null>()),
    },
    { accessorKey: 'hiredOn', header: 'Hired', cell: (c) => formatDate(c.getValue<string | null>()) }
  ]

  if (!companyId) return <NeedsCompany />

  return (
    <>
      <PageHeader title="Drivers" description="Your drivers and the truck each one is assigned to.">
        <Button onClick={openCreate}>
          <Plus className="size-4" /> New driver
        </Button>
      </PageHeader>

      <ListShell
        listState={listState}
        query={query}
        columns={columns}
        onRowClick={(driver) => navigate(`/drivers/${driver.id}`)}
        searchPlaceholder="Search name or license…"
        emptyMessage="No drivers match these filters."
        filters={
          <FilterSelect
            value={status}
            onChange={setStatus}
            options={DRIVER_STATUSES}
            placeholder="Status"
            allLabel="All statuses"
          />
        }
      />

      <DriverFormSheet
        open={open}
        onOpenChange={setOpen}
        driver={editing}
        companyId={companyId}
      />
    </>
  )
}
