import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { truckServiceSchema, type TruckServiceFormValues } from '@/lib/schemas'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/common/page-header'
import { ListShell } from '@/components/common/list-shell'
import { ResourceSheet } from '@/components/common/resource-sheet'
import { RowActions } from '@/components/common/row-actions'
import { FilterSelect } from '@/components/common/filter-select'
import { NeedsCompany } from '@/components/common/needs-company'
import { DateField, NumberField, SelectField, TextAreaField, TextField } from '@/components/common/form'
import { useListState } from '@/hooks/use-list-state'
import { useCompany } from '@/hooks/use-company'
import { truckServices, trucks, type TruckServiceBody } from '@/hooks/use-resources'
import { formatDate, formatMoney, formatNumber, humanize } from '@/lib/format'
import { SERVICE_TYPES, type ServiceType, type TruckServiceRecord } from '@/types/api'
import type { Columns } from '@/components/common/data-table'

const EMPTY: TruckServiceFormValues = {
  truckId: '' as never, type: 'Maintenance', description: '',
  serviceDate: new Date().toISOString().slice(0, 10), cost: 0, currency: 'EUR',
  odometerKm: null, provider: null, nextServiceDate: null, notes: null,
}

export function TruckServicesPage() {
  const { companyId } = useCompany()
  const listState = useListState()
  const [type, setType] = useState<string | null>(null)
  const [truckId, setTruckId] = useState<string | null>(null)
  const [editing, setEditing] = useState<TruckServiceRecord | null>(null)
  const [open, setOpen] = useState(false)

  const query = truckServices.useList(
    { companyId, type, truckId, page: listState.page, pageSize: listState.pageSize },
    Boolean(companyId),
  )
  const truckList = trucks.useList({ companyId, pageSize: 200 }, Boolean(companyId))
  const truckOptions = useMemo(
    () => (truckList.data?.items ?? []).map((t) => ({
      value: t.id, label: `${t.plateNumber} · ${t.make} ${t.model}`,
    })),
    [truckList.data],
  )

  const create = truckServices.useCreate()
  const update = truckServices.useUpdate()
  const remove = truckServices.useRemove()

  const form = useForm<TruckServiceFormValues>({ resolver: zodResolver(truckServiceSchema), defaultValues: EMPTY })

  function openCreate() {
    setEditing(null)
    form.reset(EMPTY)
    setOpen(true)
  }

  function openEdit(record: TruckServiceRecord) {
    setEditing(record)
    form.reset({
      truckId: record.truckId as never,
      type: record.type,
      description: record.description,
      serviceDate: record.serviceDate.slice(0, 10),
      cost: record.cost,
      currency: record.currency,
      odometerKm: record.odometerKm,
      provider: record.provider,
      nextServiceDate: record.nextServiceDate ? record.nextServiceDate.slice(0, 10) : null,
      notes: record.notes,
    })
    setOpen(true)
  }

  const submit = form.handleSubmit((values) => {
    const body: TruckServiceBody = { ...values, currency: values.currency.toUpperCase() }
    const done = { onSuccess: () => setOpen(false) }
    if (editing) update.mutate({ id: editing.id, body }, done)
    else create.mutate(body, done)
  })

  const columns: Columns<TruckServiceRecord> = [
    {
      accessorKey: 'serviceDate',
      header: 'Date',
      cell: (c) => <span className="tabular-nums">{formatDate(c.getValue<string>())}</span>,
    },
    {
      accessorKey: 'truckPlate',
      header: 'Truck',
      cell: (c) => <span className="font-medium tabular-nums">{c.getValue<string | null>() ?? '—'}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: (c) => <Badge variant="outline">{humanize(c.getValue<ServiceType>())}</Badge>,
    },
    {
      accessorKey: 'description',
      header: 'Work',
      cell: (c) => (
        <div className="max-w-[280px] truncate" title={c.getValue<string>()}>
          {c.getValue<string>()}
        </div>
      ),
    },
    {
      accessorKey: 'cost',
      header: 'Cost',
      cell: (c) => (
        <span className="tabular-nums">{formatMoney(c.getValue<number>(), c.row.original.currency)}</span>
      ),
    },
    {
      accessorKey: 'odometerKm',
      header: 'Odometer',
      cell: (c) => <span className="tabular-nums">{formatNumber(c.getValue<number | null>(), ' km')}</span>,
    },
    { accessorKey: 'provider', header: 'Provider', cell: (c) => c.getValue<string | null>() ?? '—' },
    {
      accessorKey: 'nextServiceDate',
      header: 'Next due',
      cell: (c) => <span className="tabular-nums">{formatDate(c.getValue<string | null>())}</span>,
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
      <PageHeader title="Truck Services" description="Maintenance, repairs and inspections.">
        <Button onClick={openCreate}>
          <Plus className="size-4" /> New record
        </Button>
      </PageHeader>

      <ListShell
        listState={listState}
        query={query}
        columns={columns}
        emptyMessage="No service records match these filters."
        filters={
          <>
            <FilterSelect
              value={truckId}
              onChange={setTruckId}
              options={truckOptions}
              placeholder="Truck"
              allLabel="All trucks"
              className="w-[220px]"
            />
            <FilterSelect
              value={type}
              onChange={setType}
              options={SERVICE_TYPES}
              placeholder="Type"
              allLabel="All types"
            />
          </>
        }
      />

      <ResourceSheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit service record' : 'New service record'}
        onSubmit={submit}
        isPending={create.isPending || update.isPending}
      >
        <SelectField
          control={form.control}
          name="truckId"
          label="Truck"
          options={truckOptions}
          placeholder={truckOptions.length ? 'Select truck' : 'No trucks yet'}
          className="col-span-2"
        />
        <SelectField control={form.control} name="type" label="Type" options={SERVICE_TYPES} />
        <DateField control={form.control} name="serviceDate" label="Service date" />
        <TextAreaField control={form.control} name="description" label="Work done" className="col-span-2" />
        <NumberField control={form.control} name="cost" label="Cost" />
        <TextField control={form.control} name="currency" label="Currency" placeholder="EUR" />
        <NumberField control={form.control} name="odometerKm" label="Odometer (km)" step="1" />
        <DateField control={form.control} name="nextServiceDate" label="Next due" />
        <TextField control={form.control} name="provider" label="Provider" className="col-span-2" />
        <TextAreaField control={form.control} name="notes" label="Notes" className="col-span-2" />
      </ResourceSheet>
    </>
  )
}
