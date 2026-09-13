import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ResourceSheet } from '@/components/common/resource-sheet'
import {
  DateField, NumberField, SelectField, TextAreaField, TextField,
} from '@/components/common/form'
import { shipmentSchema, type ShipmentFormValues } from '@/lib/schemas'
import { customers, shipments, type ShipmentBody } from '@/hooks/use-resources'
import { fromDateTimeInput, toDateTimeInput } from '@/lib/format'
import { SHIPMENT_STATUSES, type Shipment } from '@/types/api'

function emptyValues(): ShipmentFormValues {
  return {
    customerId: '' as never, reference: '', originAddress: '', destinationAddress: '',
    cargoDescription: '', weightKg: 0, price: null, currency: 'UAH',
    pickupDate: toDateTimeInput(new Date().toISOString()), deliveryDate: null,
    status: 'Draft', notes: null,
  }
}

function toFormValues(shipment: Shipment): ShipmentFormValues {
  return {
    customerId: shipment.customerId as never,
    reference: shipment.reference,
    originAddress: shipment.originAddress,
    destinationAddress: shipment.destinationAddress,
    cargoDescription: shipment.cargoDescription,
    weightKg: shipment.weightKg,
    price: shipment.price,
    currency: shipment.currency,
    pickupDate: toDateTimeInput(shipment.pickupDate),
    deliveryDate: shipment.deliveryDate ? toDateTimeInput(shipment.deliveryDate) : null,
    status: shipment.status,
    notes: shipment.notes,
  }
}

export function ShipmentFormSheet({
  open, onOpenChange, shipment, companyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipment: Shipment | null
  companyId: string
}) {
  const create = shipments.useCreate()
  const update = shipments.useUpdate()
  const customerList = customers.useList({ companyId, pageSize: 200 }, open)

  const customerOptions = useMemo(
    () => (customerList.data?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    [customerList.data],
  )

  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: emptyValues(),
  })

  useEffect(() => {
    if (open) form.reset(shipment ? toFormValues(shipment) : emptyValues())
  }, [open, shipment, form])

  const submit = form.handleSubmit((values) => {
    const body: ShipmentBody = {
      ...values,
      companyId,
      currency: values.currency.toUpperCase(),
      pickupDate: fromDateTimeInput(values.pickupDate),
      deliveryDate: values.deliveryDate ? fromDateTimeInput(values.deliveryDate) : null,
    }
    const done = { onSuccess: () => onOpenChange(false) }
    if (shipment) update.mutate({ id: shipment.id, body }, done)
    else create.mutate(body, done)
  })

  return (
    <ResourceSheet
      open={open}
      onOpenChange={onOpenChange}
      title={shipment ? `Edit ${shipment.reference}` : 'New shipment'}
      onSubmit={submit}
      isPending={create.isPending || update.isPending}
    >
      <TextField control={form.control} name="reference" label="Reference" placeholder="SHP-0001" />
      <SelectField control={form.control} name="status" label="Status" options={SHIPMENT_STATUSES} />
      <SelectField
        control={form.control}
        name="customerId"
        label="Customer"
        options={customerOptions}
        placeholder={customerOptions.length ? 'Select customer' : 'No customers yet'}
        className="col-span-2"
      />
      <TextField control={form.control} name="originAddress" label="Origin" className="col-span-2" />
      <TextField control={form.control} name="destinationAddress" label="Destination" className="col-span-2" />
      <TextAreaField control={form.control} name="cargoDescription" label="Cargo" className="col-span-2" />
      <NumberField control={form.control} name="weightKg" label="Weight (kg)" />
      <NumberField control={form.control} name="price" label="Price" />
      <TextField control={form.control} name="currency" label="Currency" placeholder="UAH" />
      <div />
      <DateField control={form.control} name="pickupDate" label="Pickup" withTime />
      <DateField control={form.control} name="deliveryDate" label="Delivery" withTime />
      <TextAreaField control={form.control} name="notes" label="Notes" className="col-span-2" />
    </ResourceSheet>
  )
}
