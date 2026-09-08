import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/common/page-header'
import { ListShell } from '@/components/common/list-shell'
import { ResourceSheet } from '@/components/common/resource-sheet'
import { RowActions } from '@/components/common/row-actions'
import { FilterSelect } from '@/components/common/filter-select'
import { NeedsCompany } from '@/components/common/needs-company'
import { CheckboxField, TextAreaField, TextField } from '@/components/common/form'
import { useListState } from '@/hooks/use-list-state'
import { useCompany } from '@/hooks/use-company'
import { customers, type CustomerBody } from '@/hooks/use-resources'
import type { Columns } from '@/components/common/data-table'
import type { Customer } from '@/types/api'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  taxId: z.string().max(32).nullable(),
  contactPerson: z.string().max(200).nullable(),
  phone: z.string().max(32).nullable(),
  email: z.email('Invalid email').max(200).nullable(),
  address: z.string().max(400).nullable(),
  notes: z.string().max(1000).nullable(),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = {
  name: '', taxId: null, contactPerson: null, phone: null,
  email: null, address: null, notes: null, isActive: true,
}

export function CustomersPage() {
  const { companyId } = useCompany()
  const state = useListState()
  const [active, setActive] = useState<string | null>(null)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [open, setOpen] = useState(false)

  const query = customers.useList(
    {
      companyId, isActive: active, page: state.page,
      pageSize: state.pageSize, search: state.debouncedSearch,
    },
    Boolean(companyId),
  )
  const create = customers.useCreate()
  const update = customers.useUpdate()
  const remove = customers.useRemove()

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  function openCreate() {
    setEditing(null)
    form.reset(EMPTY)
    setOpen(true)
  }

  function openEdit(customer: Customer) {
    setEditing(customer)
    form.reset({
      name: customer.name, taxId: customer.taxId, contactPerson: customer.contactPerson,
      phone: customer.phone, email: customer.email, address: customer.address,
      notes: customer.notes, isActive: customer.isActive,
    })
    setOpen(true)
  }

  const submit = form.handleSubmit((values) => {
    if (!companyId) return
    const body: CustomerBody = { ...values, companyId }
    const done = { onSuccess: () => setOpen(false) }
    if (editing) update.mutate({ id: editing.id, body }, done)
    else create.mutate(body, done)
  })

  const columns: Columns<Customer> = [
    { accessorKey: 'name', header: 'Customer', cell: (c) => <span className="font-medium">{c.getValue<string>()}</span> },
    {
      accessorKey: 'contactPerson',
      header: 'Contact',
      cell: (c) => c.getValue<string | null>() ?? '—',
    },
    { accessorKey: 'phone', header: 'Phone', cell: (c) => c.getValue<string | null>() ?? '—' },
    { accessorKey: 'email', header: 'Email', cell: (c) => c.getValue<string | null>() ?? '—' },
    { accessorKey: 'taxId', header: 'Tax ID', cell: (c) => c.getValue<string | null>() ?? '—' },
    {
      accessorKey: 'isActive',
      header: 'Active',
      cell: (c) =>
        c.getValue<boolean>() ? (
          <Badge variant="outline" className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground border-transparent bg-muted">
            Inactive
          </Badge>
        ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: (c) => (
        <RowActions
          onEdit={() => openEdit(c.row.original)}
          onDelete={() => remove.mutate(c.row.original.id)}
          deleteDescription="A customer that still has shipments cannot be deleted — deactivate them instead."
        />
      ),
    },
  ]

  if (!companyId) return <NeedsCompany />

  return (
    <>
      <PageHeader title="Customers" description="The companies you haul for.">
        <Button onClick={openCreate}>
          <Plus className="size-4" /> New customer
        </Button>
      </PageHeader>

      <ListShell
        state={state}
        query={query}
        columns={columns}
        searchPlaceholder="Search name or contact…"
        emptyMessage="No customers match these filters."
        filters={
          <FilterSelect
            value={active}
            onChange={setActive}
            options={[
              { value: 'true', label: 'Active only' },
              { value: 'false', label: 'Inactive only' },
            ]}
            placeholder="Active"
            allLabel="Active + inactive"
          />
        }
      />

      <ResourceSheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${editing.name}` : 'New customer'}
        onSubmit={submit}
        isPending={create.isPending || update.isPending}
      >
        <TextField control={form.control} name="name" label="Name" className="col-span-2" />
        <TextField control={form.control} name="taxId" label="Tax ID" />
        <TextField control={form.control} name="contactPerson" label="Contact person" />
        <TextField control={form.control} name="phone" label="Phone" />
        <TextField control={form.control} name="email" label="Email" type="email" />
        <TextField control={form.control} name="address" label="Address" className="col-span-2" />
        <TextAreaField control={form.control} name="notes" label="Notes" className="col-span-2" />
        <CheckboxField control={form.control} name="isActive" label="Active" className="col-span-2" />
      </ResourceSheet>
    </>
  )
}
