import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { companySchema, type CompanyFormValues } from '@/lib/schemas'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/page-header'
import { ListShell } from '@/components/common/list-shell'
import { ResourceSheet } from '@/components/common/resource-sheet'
import { TextField } from '@/components/common/form'
import { useListState } from '@/hooks/use-list-state'
import { companies, type CompanyBody } from '@/hooks/use-resources'
import { formatDate } from '@/lib/format'
import type { Columns } from '@/components/common/data-table'
import type { Company } from '@/types/api'

const EMPTY: CompanyFormValues = { name: '', taxId: null, address: null, phone: null, email: null }

export function CompaniesPage() {
  const navigate = useNavigate()
  const listState = useListState()
  const [editing, setEditing] = useState<Company | null>(null)
  const [open, setOpen] = useState(false)

  const query = companies.useList({
    page: listState.page, pageSize: listState.pageSize, search: listState.debouncedSearch,
  })
  const create = companies.useCreate()
  const update = companies.useUpdate()

  const form = useForm<CompanyFormValues>({ resolver: zodResolver(companySchema), defaultValues: EMPTY })

  function openCreate() {
    setEditing(null)
    form.reset(EMPTY)
    setOpen(true)
  }

  const submit = form.handleSubmit((values) => {
    const body: CompanyBody = values
    const done = { onSuccess: () => setOpen(false) }
    if (editing) update.mutate({ id: editing.id, body }, done)
    else create.mutate(body, done)
  })

  const columns: Columns<Company> = [
    { accessorKey: 'name', header: 'Name', cell: (c) => <span className="font-medium">{c.getValue<string>()}</span> },
    { accessorKey: 'taxId', header: 'Tax ID', cell: (c) => c.getValue<string>() ?? '—' },
    { accessorKey: 'phone', header: 'Phone', cell: (c) => c.getValue<string>() ?? '—' },
    { accessorKey: 'email', header: 'Email', cell: (c) => c.getValue<string>() ?? '—' },
    { accessorKey: 'createdAt', header: 'Created', cell: (c) => formatDate(c.getValue<string>()) }
  ]

  return (
    <>
      <PageHeader title="Companies" description="Every other record belongs to one of these.">
        <Button onClick={openCreate}>
          <Plus className="size-4" /> New company
        </Button>
      </PageHeader>

      <ListShell
        listState={listState}
        query={query}
        columns={columns}
        onRowClick={(company) => navigate(`/companies/${company.id}`)}
        searchPlaceholder="Search companies…"
        emptyMessage="No companies yet. Create one to start adding trucks and drivers."
      />

      <ResourceSheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit company' : 'New company'}
        onSubmit={submit}
        isPending={create.isPending || update.isPending}
      >
        <TextField control={form.control} name="name" label="Name" className="col-span-2" />
        <TextField control={form.control} name="taxId" label="Tax ID" />
        <TextField control={form.control} name="phone" label="Phone" />
        <TextField control={form.control} name="email" label="Email" type="email" className="col-span-2" />
        <TextField control={form.control} name="address" label="Address" className="col-span-2" />
      </ResourceSheet>
    </>
  )
}
