import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { tripSchema, type TripFormValues } from '@/lib/schemas'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/page-header'
import { ListShell } from '@/components/common/list-shell'
import { ResourceSheet } from '@/components/common/resource-sheet'
import { RowActions } from '@/components/common/row-actions'
import { FilterSelect } from '@/components/common/filter-select'
import { NeedsCompany } from '@/components/common/needs-company'
import { StatusBadge } from '@/components/common/status-badge'
import { DateField, NumberField, SelectField, TextAreaField } from '@/components/common/form'
import { useListState } from '@/hooks/use-list-state'
import { useCompany } from '@/hooks/use-company'
import { drivers, shipments, trips, trucks, type TripBody } from '@/hooks/use-resources'
import { formatDateTime, formatMoney, formatNumber, fromDateTimeInput, toDateTimeInput } from '@/lib/format'
import { TRIP_STATUSES, type Trip, type TripStatus } from '@/types/api'
import type { Columns } from '@/components/common/data-table'

const EMPTY: TripFormValues = {
  shipmentId: '' as never, driverId: '' as never, truckId: '' as never,
  startedAt: null, completedAt: null, distanceKm: null, fuelCost: null,
  status: 'Planned', notes: null,
}

export function TripsPage() {
  const { companyId } = useCompany()
  const state = useListState()
  const [status, setStatus] = useState<string | null>(null)
  const [editing, setEditing] = useState<Trip | null>(null)
  const [open, setOpen] = useState(false)

  // Trips are filtered by company through their shipment, so the visible set is
  // the trips whose shipment belongs to the selected company.
  const shipmentList = shipments.useList({ companyId, pageSize: 200 }, Boolean(companyId))
  const driverList = drivers.useList({ companyId, pageSize: 200 }, Boolean(companyId))
  const truckList = trucks.useList({ companyId, pageSize: 200 }, Boolean(companyId))

  const shipmentIds = useMemo(
    () => new Set((shipmentList.data?.items ?? []).map((s) => s.id)),
    [shipmentList.data],
  )

  const query = trips.useList(
    { status, page: state.page, pageSize: state.pageSize },
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

  const shipmentOptions = useMemo(
    () => (shipmentList.data?.items ?? []).map((s) => ({
      value: s.id, label: `${s.reference} · ${s.originAddress} → ${s.destinationAddress}`,
    })),
    [shipmentList.data],
  )
  const driverOptions = useMemo(
    () => (driverList.data?.items ?? []).map((d) => ({
      value: d.id, label: `${d.lastName} ${d.firstName}`,
    })),
    [driverList.data],
  )
  const truckOptions = useMemo(
    () => (truckList.data?.items ?? []).map((t) => ({
      value: t.id, label: `${t.plateNumber} · ${t.make} ${t.model}`,
    })),
    [truckList.data],
  )

  const create = trips.useCreate()
  const update = trips.useUpdate()
  const remove = trips.useRemove()

  const form = useForm<TripFormValues>({ resolver: zodResolver(tripSchema), defaultValues: EMPTY })

  function openCreate() {
    setEditing(null)
    form.reset(EMPTY)
    setOpen(true)
  }

  function openEdit(trip: Trip) {
    setEditing(trip)
    form.reset({
      shipmentId: trip.shipmentId as never,
      driverId: trip.driverId as never,
      truckId: trip.truckId as never,
      startedAt: trip.startedAt ? toDateTimeInput(trip.startedAt) : null,
      completedAt: trip.completedAt ? toDateTimeInput(trip.completedAt) : null,
      distanceKm: trip.distanceKm,
      fuelCost: trip.fuelCost,
      status: trip.status,
      notes: trip.notes,
    })
    setOpen(true)
  }

  const submit = form.handleSubmit((values) => {
    const body: TripBody = {
      ...values,
      startedAt: values.startedAt ? fromDateTimeInput(values.startedAt) : null,
      completedAt: values.completedAt ? fromDateTimeInput(values.completedAt) : null,
    }
    const done = { onSuccess: () => setOpen(false) }
    if (editing) update.mutate({ id: editing.id, body }, done)
    else create.mutate(body, done)
  })

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
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: (c) => (
        <RowActions
          onEdit={() => openEdit(c.row.original)}
          onDelete={() => remove.mutate(c.row.original.id)}
        />
      ),
    },
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
        state={state}
        query={scoped}
        columns={columns}
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

      <ResourceSheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit trip ${editing.shipmentReference ?? ''}` : 'New trip'}
        onSubmit={submit}
        isPending={create.isPending || update.isPending}
      >
        <SelectField
          control={form.control}
          name="shipmentId"
          label="Shipment"
          options={shipmentOptions}
          placeholder={shipmentOptions.length ? 'Select shipment' : 'No shipments yet'}
          className="col-span-2"
        />
        <SelectField
          control={form.control}
          name="driverId"
          label="Driver"
          options={driverOptions}
          placeholder={driverOptions.length ? 'Select driver' : 'No drivers yet'}
        />
        <SelectField
          control={form.control}
          name="truckId"
          label="Truck"
          options={truckOptions}
          placeholder={truckOptions.length ? 'Select truck' : 'No trucks yet'}
        />
        <SelectField control={form.control} name="status" label="Status" options={TRIP_STATUSES} />
        <div />
        <DateField control={form.control} name="startedAt" label="Started at" withTime />
        <DateField control={form.control} name="completedAt" label="Completed at" withTime />
        <NumberField control={form.control} name="distanceKm" label="Distance (km)" />
        <NumberField control={form.control} name="fuelCost" label="Fuel cost" />
        <TextAreaField control={form.control} name="notes" label="Notes" className="col-span-2" />
      </ResourceSheet>
    </>
  )
}
