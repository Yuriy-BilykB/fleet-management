import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/common/status-badge'
import { ConfirmDelete } from '@/components/common/confirm-delete'
import { DataTable, type Columns } from '@/components/common/data-table'
import { ResourceSheet } from '@/components/common/resource-sheet'
import { TextField } from '@/components/common/form'
import { companySchema, type CompanyFormValues } from '@/lib/schemas'
import {
  DetailBreadcrumb, DetailHeader, DetailLayout, DetailTabs, FieldGrid, RailCard, Section,
  type Field, type Metric,
} from '@/components/detail/detail-shell'
import { companies, customers, drivers, shipments, trucks } from '@/hooks/use-resources'
import { formatDate, formatMoney, formatNumber } from '@/lib/format'
import type { Company, Customer, Driver, Truck } from '@/types/api'

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)

  const companyQuery = companies.useById(id)
  const company = companyQuery.data

  const trucksQuery = trucks.useList({ companyId: id, pageSize: 200 }, Boolean(id))
  const driversQuery = drivers.useList({ companyId: id, pageSize: 200 }, Boolean(id))
  const customersQuery = customers.useList({ companyId: id, pageSize: 200 }, Boolean(id))
  const shipmentsQuery = shipments.useList({ companyId: id, pageSize: 200 }, Boolean(id))

  const truckList = useMemo(() => trucksQuery.data?.items ?? [], [trucksQuery.data])
  const driverList = useMemo(() => driversQuery.data?.items ?? [], [driversQuery.data])
  const customerList = useMemo(() => customersQuery.data?.items ?? [], [customersQuery.data])
  const shipmentList = useMemo(() => shipmentsQuery.data?.items ?? [], [shipmentsQuery.data])

  const remove = companies.useRemove()

  if (companyQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-[190px] rounded-[14px]" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!company) {
    return (
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-medium">Company not found</p>
        <Button render={<Link to="/companies" />}>
          <ArrowLeft className="size-4" /> Back to companies
        </Button>
      </Card>
    )
  }

  const revenue = shipmentList
    .filter((s) => s.status !== 'Cancelled')
    .reduce((sum, s) => sum + (s.price ?? 0), 0)
  const capacity = truckList.reduce((sum, t) => sum + t.capacityKg, 0)

  const initials = company.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const metrics: Metric[] = [
    { label: 'Trucks', value: trucksQuery.data?.total ?? 0, sub: `${formatNumber(capacity)} kg total` },
    { label: 'Drivers', value: driversQuery.data?.total ?? 0, sub: `${driverList.filter((d) => d.status === 'Active').length} active` },
    { label: 'Customers', value: customersQuery.data?.total ?? 0, sub: `${customerList.filter((c) => c.isActive).length} active` },
    { label: 'Shipments', value: shipmentsQuery.data?.total ?? 0, sub: 'all time' },
    { label: 'Revenue', value: formatMoney(revenue), sub: 'excl. cancelled' },
  ]

  const fields: Field[] = [
    { label: 'Name', value: company.name },
    { label: 'Tax ID', value: company.taxId ?? '—' },
    { label: 'Phone', value: company.phone ?? '—' },
    { label: 'Email', value: company.email ?? '—' },
    { label: 'Address', value: company.address ?? '—' },
    { label: 'Created', value: formatDate(company.createdAt) },
  ]

  const truckColumns: Columns<Truck> = [
    { accessorKey: 'plateNumber', header: 'Plate', cell: (c) => <span className="font-mono font-medium">{c.getValue<string>()}</span> },
    { id: 'vehicle', header: 'Vehicle', accessorFn: (row) => `${row.make} ${row.model}`, cell: (c) => c.getValue<string>() },
    { accessorKey: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.getValue<string>()} /> },
    { accessorKey: 'odometerKm', header: 'Odometer', cell: (c) => <span className="tabular-nums">{formatNumber(c.getValue<number>(), ' km')}</span> },
  ]

  const driverColumns: Columns<Driver> = [
    { id: 'name', header: 'Driver', accessorFn: (row) => `${row.lastName} ${row.firstName}`, cell: (c) => <span className="font-medium">{c.getValue<string>()}</span> },
    { accessorKey: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.getValue<string>()} /> },
    { accessorKey: 'assignedTruckPlate', header: 'Truck', cell: (c) => c.getValue<string | null>() ?? '—' },
    { accessorKey: 'licenseNumber', header: 'Licence' },
  ]

  const customerColumns: Columns<Customer> = [
    { accessorKey: 'name', header: 'Customer', cell: (c) => <span className="font-medium">{c.getValue<string>()}</span> },
    { accessorKey: 'contactPerson', header: 'Contact', cell: (c) => c.getValue<string | null>() ?? '—' },
    { accessorKey: 'phone', header: 'Phone', cell: (c) => c.getValue<string | null>() ?? '—' },
    { accessorKey: 'isActive', header: 'Active', cell: (c) => (c.getValue<boolean>() ? 'Yes' : 'No') },
  ]

  return (
    <div className="flex flex-col gap-[18px]">
      <DetailBreadcrumb section="Companies" to="/companies" code={company.name} />

      <DetailHeader
        glyph={initials}
        title={company.name}
        meta={[
          { label: 'Tax ID', value: company.taxId ?? '—' },
          { label: 'Phone', value: company.phone ?? '—' },
          { label: 'Email', value: company.email ?? '—' },
        ]}
        metrics={metrics}
        actions={
          <>
            <Button onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            <ConfirmDelete
              title={`Delete ${company.name}?`}
              description="A company that still has trucks, drivers, customers or shipments cannot be deleted."
              onConfirm={() =>
                remove.mutate(company.id, { onSuccess: () => navigate('/companies', { replace: true }) })
              }
              trigger={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Delete"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              }
            />
          </>
        }
      />

      <DetailTabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'trucks', label: 'Trucks', count: trucksQuery.data?.total ?? 0 },
          { id: 'drivers', label: 'Drivers', count: driversQuery.data?.total ?? 0 },
          { id: 'customers', label: 'Customers', count: customersQuery.data?.total ?? 0 },
        ]}
        value={tab}
        onChange={setTab}
      />

      <DetailLayout
        main={
          <>
            {tab === 'overview' && (
              <Section title="Company details">
                <FieldGrid fields={fields} />
              </Section>
            )}
            {tab === 'trucks' && (
              <Section title="Trucks">
                <DataTable
                  columns={truckColumns}
                  data={truckList}
                  isLoading={trucksQuery.isLoading}
                  emptyMessage="No trucks yet."
                  onRowClick={(truck) => navigate(`/trucks/${truck.id}`)}
                />
              </Section>
            )}
            {tab === 'drivers' && (
              <Section title="Drivers">
                <DataTable
                  columns={driverColumns}
                  data={driverList}
                  isLoading={driversQuery.isLoading}
                  emptyMessage="No drivers yet."
                  onRowClick={(driver) => navigate(`/drivers/${driver.id}`)}
                />
              </Section>
            )}
            {tab === 'customers' && (
              <Section title="Customers">
                <DataTable
                  columns={customerColumns}
                  data={customerList}
                  isLoading={customersQuery.isLoading}
                  emptyMessage="No customers yet."
                  onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
                />
              </Section>
            )}
          </>
        }
        rail={
          <RailCard
            title="Fleet at a glance"
            items={[
              { label: 'Available trucks', value: truckList.filter((t) => t.status === 'Available').length },
              { label: 'On trip', value: truckList.filter((t) => t.status === 'OnTrip').length },
              { label: 'In service', value: truckList.filter((t) => t.status === 'InService').length },
              { label: 'Shipments in transit', value: shipmentList.filter((s) => s.status === 'InTransit').length },
            ]}
          />
        }
      />

      <CompanyEditSheet open={editOpen} onOpenChange={setEditOpen} company={company} />
    </div>
  )
}

// The company form has no consumer beyond this page, so it stays local.

function CompanyEditSheet({
  open, onOpenChange, company,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: Company
}) {
  const update = companies.useUpdate()
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company.name, taxId: company.taxId, address: company.address,
      phone: company.phone, email: company.email,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: company.name, taxId: company.taxId, address: company.address,
        phone: company.phone, email: company.email,
      })
    }
  }, [open, company, form])

  const submit = form.handleSubmit((values) =>
    update.mutate({ id: company.id, body: values }, { onSuccess: () => onOpenChange(false) }),
  )

  return (
    <ResourceSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${company.name}`}
      onSubmit={submit}
      isPending={update.isPending}
    >
      <TextField control={form.control} name="name" label="Name" className="col-span-2" />
      <TextField control={form.control} name="taxId" label="Tax ID" />
      <TextField control={form.control} name="phone" label="Phone" />
      <TextField control={form.control} name="email" label="Email" type="email" className="col-span-2" />
      <TextField control={form.control} name="address" label="Address" className="col-span-2" />
    </ResourceSheet>
  )
}
