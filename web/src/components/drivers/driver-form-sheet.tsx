import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ResourceSheet } from '@/components/common/resource-sheet'
import { DateField, SelectField, TextAreaField, TextField } from '@/components/common/form'
import { driverSchema, type DriverFormValues } from '@/lib/schemas'
import { drivers, trucks, type DriverBody } from '@/hooks/use-resources'
import { DRIVER_STATUSES, type Driver } from '@/types/api'

const EMPTY: DriverFormValues = {
  firstName: '', lastName: '', phone: null, email: null, licenseNumber: '',
  licenseExpiry: null, hiredOn: null, status: 'Active', assignedTruckId: null, notes: null,
}

function toFormValues(driver: Driver): DriverFormValues {
  return {
    firstName: driver.firstName, lastName: driver.lastName, phone: driver.phone,
    email: driver.email, licenseNumber: driver.licenseNumber, licenseExpiry: driver.licenseExpiry,
    hiredOn: driver.hiredOn, status: driver.status,
    assignedTruckId: driver.assignedTruckId, notes: driver.notes,
  }
}

export function DriverFormSheet({
  open, onOpenChange, driver, companyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  driver: Driver | null
  companyId: string
}) {
  const create = drivers.useCreate()
  const update = drivers.useUpdate()
  const truckList = trucks.useList({ companyId, pageSize: 200 }, open)

  const truckOptions = useMemo(
    () => (truckList.data?.items ?? []).map((t) => ({
      value: t.id, label: `${t.plateNumber} · ${t.make} ${t.model}`,
    })),
    [truckList.data],
  )

  const form = useForm<DriverFormValues>({ resolver: zodResolver(driverSchema), defaultValues: EMPTY })

  useEffect(() => {
    if (open) form.reset(driver ? toFormValues(driver) : EMPTY)
  }, [open, driver, form])

  const submit = form.handleSubmit((values) => {
    const body: DriverBody = { ...values, companyId }
    const done = { onSuccess: () => onOpenChange(false) }
    if (driver) update.mutate({ id: driver.id, body }, done)
    else create.mutate(body, done)
  })

  return (
    <ResourceSheet
      open={open}
      onOpenChange={onOpenChange}
      title={driver ? `Edit ${driver.firstName} ${driver.lastName}` : 'New driver'}
      onSubmit={submit}
      isPending={create.isPending || update.isPending}
    >
      <TextField control={form.control} name="firstName" label="First name" />
      <TextField control={form.control} name="lastName" label="Last name" />
      <TextField control={form.control} name="phone" label="Phone" />
      <TextField control={form.control} name="email" label="Email" type="email" />
      <TextField control={form.control} name="licenseNumber" label="License number" />
      <SelectField control={form.control} name="status" label="Status" options={DRIVER_STATUSES} />
      <DateField control={form.control} name="licenseExpiry" label="License expires" />
      <DateField control={form.control} name="hiredOn" label="Hired on" />
      <SelectField
        control={form.control}
        name="assignedTruckId"
        label="Assigned truck"
        options={truckOptions}
        allowEmpty
        placeholder="Unassigned"
        className="col-span-2"
      />
      <TextAreaField control={form.control} name="notes" label="Notes" className="col-span-2" />
    </ResourceSheet>
  )
}
