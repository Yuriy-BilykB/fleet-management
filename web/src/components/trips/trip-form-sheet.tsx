import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ResourceSheet } from '@/components/common/resource-sheet'
import { DateField, NumberField, SelectField, TextAreaField } from '@/components/common/form'
import { tripSchema, type TripFormValues } from '@/lib/schemas'
import { drivers, shipments, trips, trucks, type TripBody } from '@/hooks/use-resources'
import { fromDateTimeInput, toDateTimeInput } from '@/lib/format'
import { TRIP_STATUSES, type Trip } from '@/types/api'

const EMPTY: TripFormValues = {
  shipmentId: '' as never, driverId: '' as never, truckId: '' as never,
  startedAt: null, completedAt: null, distanceKm: null, fuelCost: null,
  status: 'Planned', notes: null,
}

function toFormValues(trip: Trip): TripFormValues {
  return {
    shipmentId: trip.shipmentId as never,
    driverId: trip.driverId as never,
    truckId: trip.truckId as never,
    startedAt: trip.startedAt ? toDateTimeInput(trip.startedAt) : null,
    completedAt: trip.completedAt ? toDateTimeInput(trip.completedAt) : null,
    distanceKm: trip.distanceKm,
    fuelCost: trip.fuelCost,
    status: trip.status,
    notes: trip.notes,
  }
}

export function TripFormSheet({
  open, onOpenChange, trip, companyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trip: Trip | null
  companyId: string
}) {
  const create = trips.useCreate()
  const update = trips.useUpdate()
  const shipmentList = shipments.useList({ companyId, pageSize: 200 }, open)
  const driverList = drivers.useList({ companyId, pageSize: 200 }, open)
  const truckList = trucks.useList({ companyId, pageSize: 200 }, open)

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

  const form = useForm<TripFormValues>({ resolver: zodResolver(tripSchema), defaultValues: EMPTY })

  useEffect(() => {
    if (open) form.reset(trip ? toFormValues(trip) : EMPTY)
  }, [open, trip, form])

  const submit = form.handleSubmit((values) => {
    const body: TripBody = {
      ...values,
      startedAt: values.startedAt ? fromDateTimeInput(values.startedAt) : null,
      completedAt: values.completedAt ? fromDateTimeInput(values.completedAt) : null,
    }
    const done = { onSuccess: () => onOpenChange(false) }
    if (trip) update.mutate({ id: trip.id, body }, done)
    else create.mutate(body, done)
  })

  return (
    <ResourceSheet
      open={open}
      onOpenChange={onOpenChange}
      title={trip ? `Edit trip ${trip.shipmentReference ?? ''}` : 'New trip'}
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
  )
}
