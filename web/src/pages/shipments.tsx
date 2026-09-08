import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, UserPlus } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/page-header'
import { ListShell } from '@/components/common/list-shell'
import { ResourceSheet } from '@/components/common/resource-sheet'
import { RowActions } from '@/components/common/row-actions'
import { FilterSelect } from '@/components/common/filter-select'
import { NeedsCompany } from '@/components/common/needs-company'
import { StatusBadge } from '@/components/common/status-badge'
import {
  DateField, NumberField, SelectField, TextAreaField, TextField,
} from '@/components/common/form'
import { useListState } from '@/hooks/use-list-state'
import { useCompany } from '@/hooks/use-company'
import { customers, drivers, shipments, trucks, type ShipmentBody } from '@/hooks/use-resources'
import { showError } from '@/hooks/use-crud'
import { api } from '@/lib/api'
import { formatDateTime, formatMoney, formatNumber, fromDateTimeInput, toDateTimeInput } from '@/lib/format'
import { SHIPMENT_STATUSES, type Shipment, type ShipmentStatus, type Trip } from '@/types/api'
import type { Columns } from '@/components/common/data-table'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

const schema = z
  .object({
    customerId: z.uuid('Pick a customer'),
    reference: z.string().min(1, 'Reference is required').max(32),
    originAddress: z.string().min(1, 'Origin is required').max(400),
    destinationAddress: z.string().min(1, 'Destination is required').max(400),
    cargoDescription: z.string().min(1, 'Describe the cargo').max(1000),
    weightKg: z.number().min(0).max(100000),
    price: z.number().min(0).nullable(),
    currency: z.string().length(3, 'Use a 3-letter code'),
    pickupDate: z.string().min(1, 'Pickup date is required'),
    deliveryDate: z.string().nullable(),
    status: z.enum(SHIPMENT_STATUSES),
    notes: z.string().max(1000).nullable(),
  })
  .refine(
    (v) => !v.deliveryDate || new Date(v.deliveryDate) >= new Date(v.pickupDate),
    { path: ['deliveryDate'], message: 'Delivery cannot be before pickup' },
  )

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = {
  customerId: '' as never, reference: '', originAddress: '', destinationAddress: '',
  cargoDescription: '', weightKg: 0, price: null, currency: 'UAH',
  pickupDate: toDateTimeInput(new Date().toISOString()), deliveryDate: null,
  status: 'Draft', notes: null,
}

const assignSchema = z.object({
  driverId: z.uuid('Pick a driver'),
  truckId: z.uuid('Pick a truck'),
  startedAt: z.string().nullable(),
  notes: z.string().max(1000).nullable(),
})

type AssignValues = z.infer<typeof assignSchema>

export function ShipmentsPage() {
  const { companyId } = useCompany()
  const queryClient = useQueryClient()
  const state = useListState()
  const [status, setStatus] = useState<string | null>(null)
  const [editing, setEditing] = useState<Shipment | null>(null)
  const [open, setOpen] = useState(false)
  const [assigning, setAssigning] = useState<Shipment | null>(null)

  const query = shipments.useList(
    { companyId, status, page: state.page, pageSize: state.pageSize, search: state.debouncedSearch },
    Boolean(companyId),
  )
  const customerList = customers.useList({ companyId, pageSize: 200 }, Boolean(companyId))
  const driverList = drivers.useList({ companyId, pageSize: 200 }, Boolean(companyId))
  const truckList = trucks.useList({ companyId, pageSize: 200 }, Boolean(companyId))

  const customerOptions = useMemo(
    () => (customerList.data?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    [customerList.data],
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

  const create = shipments.useCreate()
  const update = shipments.useUpdate()
  const remove = shipments.useRemove()

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })
  const assignForm = useForm<AssignValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: { driverId: '' as never, truckId: '' as never, startedAt: null, notes: null },
  })

  const assign = useMutation({
    mutationFn: (input: { shipmentId: string; body: AssignValues }) =>
      api.post<Trip>(`/shipments/${input.shipmentId}/assign`, {
        ...input.body,
        startedAt: input.body.startedAt ? fromDateTimeInput(input.body.startedAt) : null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shipments'] })
      void queryClient.invalidateQueries({ queryKey: ['trips'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Driver and truck assigned')
      setAssigning(null)
    },
    onError: showError,
  })

  function openCreate() {
    setEditing(null)
    form.reset(EMPTY)
    setOpen(true)
  }

  function openEdit(shipment: Shipment) {
    setEditing(shipment)
    form.reset({
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
    })
    setOpen(true)
  }

  function openAssign(shipment: Shipment) {
    setAssigning(shipment)
    assignForm.reset({ driverId: '' as never, truckId: '' as never, startedAt: null, notes: null })
  }

  const submit = form.handleSubmit((values) => {
    if (!companyId) return
    const body: ShipmentBody = {
      ...values,
      companyId,
      currency: values.currency.toUpperCase(),
      pickupDate: fromDateTimeInput(values.pickupDate),
      deliveryDate: values.deliveryDate ? fromDateTimeInput(values.deliveryDate) : null,
    }
    const done = { onSuccess: () => setOpen(false) }
    if (editing) update.mutate({ id: editing.id, body }, done)
    else create.mutate(body, done)
  })

  const submitAssign = assignForm.handleSubmit((values) => {
    if (!assigning) return
    assign.mutate({ shipmentId: assigning.id, body: values })
  })

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
    { accessorKey: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.getValue<ShipmentStatus>()} /> },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Assign driver and truck"
            title="Assign driver and truck"
            onClick={() => openAssign(c.row.original)}
          >
            <UserPlus className="size-4" />
          </Button>
          <RowActions
            onEdit={() => openEdit(c.row.original)}
            onDelete={() => remove.mutate(c.row.original.id)}
            deleteDescription="Trips created for this shipment are deleted along with it."
          />
        </div>
      ),
    },
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
        state={state}
        query={query}
        columns={columns}
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

      <ResourceSheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${editing.reference}` : 'New shipment'}
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

      <ResourceSheet
        open={assigning !== null}
        onOpenChange={(next) => !next && setAssigning(null)}
        title={assigning ? `Assign to ${assigning.reference}` : 'Assign'}
        description="Creates a trip for this shipment. A Draft shipment moves to Scheduled."
        onSubmit={submitAssign}
        isPending={assign.isPending}
        submitLabel="Assign"
      >
        <SelectField
          control={assignForm.control}
          name="driverId"
          label="Driver"
          options={driverOptions}
          placeholder={driverOptions.length ? 'Select driver' : 'No drivers yet'}
          className="col-span-2"
        />
        <SelectField
          control={assignForm.control}
          name="truckId"
          label="Truck"
          options={truckOptions}
          placeholder={truckOptions.length ? 'Select truck' : 'No trucks yet'}
          className="col-span-2"
        />
        <DateField control={assignForm.control} name="startedAt" label="Starts at" withTime className="col-span-2" />
        <TextAreaField control={assignForm.control} name="notes" label="Notes" className="col-span-2" />
      </ResourceSheet>
    </>
  )
}
