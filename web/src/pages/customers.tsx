import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/common/page-header'
import { ListShell } from '@/components/common/list-shell'
import { CustomerFormSheet } from '@/components/customers/customer-form-sheet'
import { FilterSelect } from '@/components/common/filter-select'
import { NeedsCompany } from '@/components/common/needs-company'
import { useListState } from '@/hooks/use-list-state'
import { useCompany } from '@/hooks/use-company'
import { customers } from '@/hooks/use-resources'
import type { Columns } from '@/components/common/data-table'
import type { Customer } from '@/types/api'

export function CustomersPage() {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const listState = useListState()
  const [active, setActive] = useState<string | null>(null)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [open, setOpen] = useState(false)

  const query = customers.useList(
    {
      companyId, isActive: active, page: listState.page,
      pageSize: listState.pageSize, search: listState.debouncedSearch,
    },
    Boolean(companyId),
  )

  function openCreate() {
    setEditing(null)
    setOpen(true)
  }

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
    }
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
        listState={listState}
        query={query}
        columns={columns}
        onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
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

      <CustomerFormSheet
        open={open}
        onOpenChange={setOpen}
        customer={editing}
        companyId={companyId}
      />
    </>
  )
}
