import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { truckSchema, type TruckFormValues } from '@/lib/schemas'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/page-header'
import { ListShell } from '@/components/common/list-shell'
import { ResourceSheet } from '@/components/common/resource-sheet'
import { RowActions } from '@/components/common/row-actions'
import { FilterSelect } from '@/components/common/filter-select'
import { NeedsCompany } from '@/components/common/needs-company'
import { StatusBadge } from '@/components/common/status-badge'
import { DateField, NumberField, SelectField, TextAreaField, TextField } from '@/components/common/form'
import { useListState } from '@/hooks/use-list-state'
import { useCompany } from '@/hooks/use-company'
import { trucks, type TruckBody } from '@/hooks/use-resources'
import { formatDate, formatNumber } from '@/lib/format'
import { TRUCK_STATUSES, type Truck, type TruckStatus } from '@/types/api'
import type { Columns } from '@/components/common/data-table'

const EMPTY: TruckFormValues = {
  plateNumber: '', make: '', model: '', vin: null, year: null,
  capacityKg: 0, odometerKm: 0, status: 'Available',
  insuranceExpiry: null, inspectionExpiry: null, notes: null,
}

export function TrucksPage() {
  const { companyId } = useCompany()
  const state = useListState()
  const [status, setStatus] = useState<string | null>(null)
  const [editing, setEditing] = useState<Truck | null>(null)
  const [open, setOpen] = useState(false)

  const query = trucks.useList(
    { companyId, status, page: state.page, pageSize: state.pageSize, search: state.debouncedSearch },
    Boolean(companyId),
  )
  const create = trucks.useCreate()
  const update = trucks.useUpdate()
  const remove = trucks.useRemove()

  const form = useForm<TruckFormValues>({ resolver: zodResolver(truckSchema), defaultValues: EMPTY })

  function openCreate() {
    setEditing(null)
    form.reset(EMPTY)
    setOpen(true)
  }

  function openEdit(truck: Truck) {
    setEditing(truck)
    form.reset({
      plateNumber: truck.plateNumber, make: truck.make, model: truck.model, vin: truck.vin,
      year: truck.year, capacityKg: truck.capacityKg, odometerKm: truck.odometerKm,
      status: truck.status, insuranceExpiry: truck.insuranceExpiry,
      inspectionExpiry: truck.inspectionExpiry, notes: truck.notes,
    })
    setOpen(true)
  }

  const submit = form.handleSubmit((values) => {
    if (!companyId) return
    const body: TruckBody = { ...values, companyId }
    const done = { onSuccess: () => setOpen(false) }
    if (editing) update.mutate({ id: editing.id, body }, done)
    else create.mutate(body, done)
  })

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
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: (c) => (
        <RowActions
          onEdit={() => openEdit(c.row.original)}
          onDelete={() => remove.mutate(c.row.original.id)}
          deleteDescription="Service records and documents for this truck are deleted too. A truck used by a trip cannot be deleted."
        />
      ),
    },
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
        state={state}
        query={query}
        columns={columns}
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

      <ResourceSheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${editing.plateNumber}` : 'New truck'}
        onSubmit={submit}
        isPending={create.isPending || update.isPending}
      >
        <TextField control={form.control} name="plateNumber" label="Plate number" placeholder="AA1234BB" />
        <SelectField control={form.control} name="status" label="Status" options={TRUCK_STATUSES} />
        <TextField control={form.control} name="make" label="Make" placeholder="Volvo" />
        <TextField control={form.control} name="model" label="Model" placeholder="FH16" />
        <TextField control={form.control} name="vin" label="VIN" />
        <NumberField control={form.control} name="year" label="Year" step="1" />
        <NumberField control={form.control} name="capacityKg" label="Capacity (kg)" />
        <NumberField control={form.control} name="odometerKm" label="Odometer (km)" step="1" />
        <DateField control={form.control} name="insuranceExpiry" label="Insurance expires" />
        <DateField control={form.control} name="inspectionExpiry" label="Inspection expires" />
        <TextAreaField control={form.control} name="notes" label="Notes" className="col-span-2" />
      </ResourceSheet>
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
