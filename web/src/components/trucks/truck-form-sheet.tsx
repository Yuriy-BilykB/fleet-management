import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ResourceSheet } from '@/components/common/resource-sheet'
import {
  DateField, NumberField, SelectField, TextAreaField, TextField,
} from '@/components/common/form'
import { truckSchema, type TruckFormValues } from '@/lib/schemas'
import { trucks, type TruckBody } from '@/hooks/use-resources'
import { TRUCK_STATUSES, type Truck } from '@/types/api'

const EMPTY: TruckFormValues = {
  plateNumber: '', make: '', model: '', vin: null, year: null,
  capacityKg: 0, odometerKm: 0, status: 'Available',
  insuranceExpiry: null, inspectionExpiry: null, notes: null,
}

function toFormValues(truck: Truck): TruckFormValues {
  return {
    plateNumber: truck.plateNumber, make: truck.make, model: truck.model, vin: truck.vin,
    year: truck.year, capacityKg: truck.capacityKg, odometerKm: truck.odometerKm,
    status: truck.status, insuranceExpiry: truck.insuranceExpiry,
    inspectionExpiry: truck.inspectionExpiry, notes: truck.notes,
  }
}

/** Create/edit form shared by the trucks list and the truck detail page. */
export function TruckFormSheet({
  open, onOpenChange, truck, companyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null creates a new truck. */
  truck: Truck | null
  companyId: string
}) {
  const create = trucks.useCreate()
  const update = trucks.useUpdate()
  const form = useForm<TruckFormValues>({ resolver: zodResolver(truckSchema), defaultValues: EMPTY })

  // Reset on open so a reused sheet never shows the previous record's values.
  useEffect(() => {
    if (open) form.reset(truck ? toFormValues(truck) : EMPTY)
  }, [open, truck, form])

  const submit = form.handleSubmit((values) => {
    const body: TruckBody = { ...values, companyId }
    const done = { onSuccess: () => onOpenChange(false) }
    if (truck) update.mutate({ id: truck.id, body }, done)
    else create.mutate(body, done)
  })

  return (
    <ResourceSheet
      open={open}
      onOpenChange={onOpenChange}
      title={truck ? `Edit ${truck.plateNumber}` : 'New truck'}
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
  )
}
