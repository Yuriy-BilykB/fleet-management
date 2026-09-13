import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ResourceSheet } from '@/components/common/resource-sheet'
import { DateField, SelectField, TextAreaField } from '@/components/common/form'
import { assignShipmentSchema, type AssignShipmentFormValues } from '@/lib/schemas'
import { drivers, trucks } from '@/hooks/use-resources'
import { showError } from '@/hooks/use-crud'
import { api } from '@/lib/api'
import { fromDateTimeInput } from '@/lib/format'
import type { Trip } from '@/types/api'

const EMPTY: AssignShipmentFormValues = {
  driverId: '' as never, truckId: '' as never, startedAt: null, notes: null,
}

/** Puts a driver and truck on a shipment — the API creates the trip. */
export function AssignSheet({
  open, onOpenChange, shipmentId, shipmentReference, companyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipmentId: string | null
  shipmentReference?: string
  companyId: string
}) {
  const queryClient = useQueryClient()
  const driverList = drivers.useList({ companyId, pageSize: 200 }, open)
  const truckList = trucks.useList({ companyId, pageSize: 200 }, open)

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

  const form = useForm<AssignShipmentFormValues>({
    resolver: zodResolver(assignShipmentSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) form.reset(EMPTY)
  }, [open, form])

  const assign = useMutation({
    mutationFn: (values: AssignShipmentFormValues) =>
      api.post<Trip>(`/shipments/${shipmentId}/assign`, {
        ...values,
        startedAt: values.startedAt ? fromDateTimeInput(values.startedAt) : null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shipments'] })
      void queryClient.invalidateQueries({ queryKey: ['trips'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Driver and truck assigned')
      onOpenChange(false)
    },
    onError: showError,
  })

  const submit = form.handleSubmit((values) => {
    if (shipmentId) assign.mutate(values)
  })

  return (
    <ResourceSheet
      open={open}
      onOpenChange={onOpenChange}
      title={shipmentReference ? `Assign to ${shipmentReference}` : 'Assign'}
      description="Creates a trip for this shipment. A Draft shipment moves to Scheduled."
      onSubmit={submit}
      isPending={assign.isPending}
      submitLabel="Assign"
    >
      <SelectField
        control={form.control}
        name="driverId"
        label="Driver"
        options={driverOptions}
        placeholder={driverOptions.length ? 'Select driver' : 'No drivers yet'}
        className="col-span-2"
      />
      <SelectField
        control={form.control}
        name="truckId"
        label="Truck"
        options={truckOptions}
        placeholder={truckOptions.length ? 'Select truck' : 'No trucks yet'}
        className="col-span-2"
      />
      <DateField control={form.control} name="startedAt" label="Starts at" withTime className="col-span-2" />
      <TextAreaField control={form.control} name="notes" label="Notes" className="col-span-2" />
    </ResourceSheet>
  )
}
