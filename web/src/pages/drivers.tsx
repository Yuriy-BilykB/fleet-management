import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { driverSchema, type DriverFormValues } from '@/lib/schemas'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/page-header'
import { ListShell } from '@/components/common/list-shell'
import { ResourceSheet } from '@/components/common/resource-sheet'
import { RowActions } from '@/components/common/row-actions'
import { FilterSelect } from '@/components/common/filter-select'
import { NeedsCompany } from '@/components/common/needs-company'
import { StatusBadge } from '@/components/common/status-badge'
import { DateField, SelectField, TextAreaField, TextField } from '@/components/common/form'
import { useListState } from '@/hooks/use-list-state'
import { useCompany } from '@/hooks/use-company'
import { drivers, trucks, type DriverBody } from '@/hooks/use-resources'
import { formatDate } from '@/lib/format'
import { DRIVER_STATUSES, type Driver, type DriverStatus } from '@/types/api'
import type { Columns } from '@/components/common/data-table'

const EMPTY: DriverFormValues = {
  firstName: '', lastName: '', phone: null, email: null, licenseNumber: '',
  licenseExpiry: null, hiredOn: null, status: 'Active', assignedTruckId: null, notes: null,
}

export function DriversPage() {
  const { companyId } = useCompany()
  const state = useListState()
  const [status, setStatus] = useState<string | null>(null)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [open, setOpen] = useState(false)

  const query = drivers.useList(
    { companyId, status, page: state.page, pageSize: state.pageSize, search: state.debouncedSearch },
    Boolean(companyId),
  )
  const truckList = trucks.useList({ companyId, pageSize: 200 }, Boolean(companyId))
  const truckOptions = useMemo(
    () => (truckList.data?.items ?? []).map((t) => ({
      value: t.id,
      label: `${t.plateNumber} · ${t.make} ${t.model}`,
    })),
    [truckList.data],
  )

  const create = drivers.useCreate()
  const update = drivers.useUpdate()
  const remove = drivers.useRemove()

  const form = useForm<DriverFormValues>({ resolver: zodResolver(driverSchema), defaultValues: EMPTY })

  function openCreate() {
    setEditing(null)
    form.reset(EMPTY)
    setOpen(true)
  }

  function openEdit(driver: Driver) {
    setEditing(driver)
    form.reset({
      firstName: driver.firstName, lastName: driver.lastName, phone: driver.phone,
      email: driver.email, licenseNumber: driver.licenseNumber, licenseExpiry: driver.licenseExpiry,
      hiredOn: driver.hiredOn, status: driver.status,
      assignedTruckId: driver.assignedTruckId, notes: driver.notes,
    })
    setOpen(true)
  }

  const submit = form.handleSubmit((values) => {
    if (!companyId) return
    const body: DriverBody = { ...values, companyId }
    const done = { onSuccess: () => setOpen(false) }
    if (editing) update.mutate({ id: editing.id, body }, done)
    else create.mutate(body, done)
  })

  const columns: Columns<Driver> = [
    {
      id: 'name',
      header: 'Driver',
      accessorFn: (row) => `${row.lastName} ${row.firstName}`,
      cell: (c) => (
        <div>
          <div className="font-medium">
            {c.row.original.lastName} {c.row.original.firstName}
          </div>
          {c.row.original.phone && (
            <div className="text-muted-foreground text-xs">{c.row.original.phone}</div>
          )}
        </div>
      ),
    },
    { accessorKey: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.getValue<DriverStatus>()} /> },
    {
      accessorKey: 'assignedTruckPlate',
      header: 'Assigned truck',
      cell: (c) =>
        c.getValue<string | null>() ?? <span className="text-muted-foreground">unassigned</span>,
    },
    { accessorKey: 'licenseNumber', header: 'License' },
    {
      accessorKey: 'licenseExpiry',
      header: 'License expires',
      cell: (c) => formatDate(c.getValue<string | null>()),
    },
    { accessorKey: 'hiredOn', header: 'Hired', cell: (c) => formatDate(c.getValue<string | null>()) },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: (c) => (
        <RowActions
          onEdit={() => openEdit(c.row.original)}
          onDelete={() => remove.mutate(c.row.original.id)}
          deleteDescription="A driver assigned to a trip cannot be deleted."
        />
      ),
    },
  ]

  if (!companyId) return <NeedsCompany />

  return (
    <>
      <PageHeader title="Drivers" description="Your drivers and the truck each one is assigned to.">
        <Button onClick={openCreate}>
          <Plus className="size-4" /> New driver
        </Button>
      </PageHeader>

      <ListShell
        state={state}
        query={query}
        columns={columns}
        searchPlaceholder="Search name or license…"
        emptyMessage="No drivers match these filters."
        filters={
          <FilterSelect
            value={status}
            onChange={setStatus}
            options={DRIVER_STATUSES}
            placeholder="Status"
            allLabel="All statuses"
          />
        }
      />

      <ResourceSheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${editing.firstName} ${editing.lastName}` : 'New driver'}
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
    </>
  )
}
