import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ResourceSheet } from '@/components/common/resource-sheet'
import {
  DateField, NumberField, SelectField, TextAreaField, TextField,
} from '@/components/common/form'
import { truckServiceSchema, type TruckServiceFormValues } from '@/lib/schemas'
import { truckServices, type TruckServiceBody } from '@/hooks/use-resources'
import { SERVICE_TYPES } from '@/types/api'

/** Logs a maintenance or repair record against one truck, from its detail page. */
export function ServiceFormSheet({
  open, onOpenChange, truckId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  truckId: string
}) {
  const create = truckServices.useCreate()

  const empty: TruckServiceFormValues = {
    truckId, type: 'Maintenance', description: '',
    serviceDate: new Date().toISOString().slice(0, 10), cost: 0, currency: 'UAH',
    odometerKm: null, provider: null, nextServiceDate: null, notes: null,
  }

  const form = useForm<TruckServiceFormValues>({
    resolver: zodResolver(truckServiceSchema),
    defaultValues: empty,
  })

  useEffect(() => {
    if (open) form.reset(empty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, truckId])

  const submit = form.handleSubmit((values) => {
    const body: TruckServiceBody = { ...values, currency: values.currency.toUpperCase() }
    create.mutate(body, { onSuccess: () => onOpenChange(false) })
  })

  return (
    <ResourceSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Log service"
      description="Maintenance, repair or inspection for this truck."
      onSubmit={submit}
      isPending={create.isPending}
    >
      <SelectField control={form.control} name="type" label="Type" options={SERVICE_TYPES} />
      <DateField control={form.control} name="serviceDate" label="Service date" />
      <TextAreaField control={form.control} name="description" label="Work done" className="col-span-2" />
      <NumberField control={form.control} name="cost" label="Cost" />
      <TextField control={form.control} name="currency" label="Currency" placeholder="UAH" />
      <NumberField control={form.control} name="odometerKm" label="Odometer (km)" step="1" />
      <DateField control={form.control} name="nextServiceDate" label="Next due" />
      <TextField control={form.control} name="provider" label="Provider" className="col-span-2" />
      <TextAreaField control={form.control} name="notes" label="Notes" className="col-span-2" />
    </ResourceSheet>
  )
}
