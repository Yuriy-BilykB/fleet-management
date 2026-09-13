import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/common/status-badge'
import { ConfirmDelete } from '@/components/common/confirm-delete'
import { DataTable, type Columns } from '@/components/common/data-table'
import { CustomerFormSheet } from '@/components/customers/customer-form-sheet'
import { ShipmentFormSheet } from '@/components/shipments/shipment-form-sheet'
import {
  ActivityFeed, DetailBreadcrumb, DetailHeader, DetailLayout, DetailTabs,
  FieldGrid, RailCard, Section,
  type ActivityItem, type Field, type Metric,
} from '@/components/detail/detail-shell'
import { customers, shipments } from '@/hooks/use-resources'
import { formatDate, formatDateTime, formatMoney, formatNumber } from '@/lib/format'
import type { Shipment } from '@/types/api'

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [shipmentOpen, setShipmentOpen] = useState(false)

  const customerQuery = customers.useById(id)
  const customer = customerQuery.data

  const shipmentsQuery = shipments.useList({ customerId: id, pageSize: 200 }, Boolean(id))
  const shipmentList = useMemo(() => shipmentsQuery.data?.items ?? [], [shipmentsQuery.data])
  const remove = customers.useRemove()

  const activity = useMemo<ActivityItem[]>(
    () =>
      shipmentList
        .map((s) => ({
          id: s.id,
          at: s.createdAt,
          time: formatDate(s.createdAt),
          title: `${s.reference} · ${s.status}`,
          description: `${s.originAddress} → ${s.destinationAddress} · ${formatNumber(s.weightKg, ' kg')}`,
          tone: (s.status === 'Delivered'
            ? 'good'
            : s.status === 'Cancelled'
              ? 'bad'
              : s.status === 'InTransit'
                ? 'info'
                : 'default') as ActivityItem['tone'],
        }))
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 8),
    [shipmentList],
  )

  if (customerQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-[190px] rounded-[14px]" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!customer) {
    return (
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-medium">Customer not found</p>
        <Button render={<Link to="/customers" />}>
          <ArrowLeft className="size-4" /> Back to customers
        </Button>
      </Card>
    )
  }

  const byStatus = (status: string) => shipmentList.filter((s) => s.status === status).length
  const revenue = shipmentList
    .filter((s) => s.status !== 'Cancelled')
    .reduce((sum, s) => sum + (s.price ?? 0), 0)
  const delivered = shipmentList.filter((s) => s.status === 'Delivered')
  const deliveredRevenue = delivered.reduce((sum, s) => sum + (s.price ?? 0), 0)
  const totalWeight = shipmentList.reduce((sum, s) => sum + s.weightKg, 0)
  const open = shipmentList.filter(
    (s) => s.status === 'Draft' || s.status === 'Scheduled' || s.status === 'InTransit',
  ).length

  const initials = customer.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const metrics: Metric[] = [
    { label: 'Shipments', value: shipmentsQuery.data?.total ?? 0, sub: `${open} open` },
    { label: 'Revenue', value: formatMoney(revenue), sub: 'excl. cancelled' },
    { label: 'Delivered', value: delivered.length, sub: formatMoney(deliveredRevenue) },
    { label: 'In transit', value: byStatus('InTransit'), sub: `${byStatus('Scheduled')} scheduled` },
    { label: 'Cargo total', value: formatNumber(totalWeight), sub: 'kg hauled' },
  ]

  const fields: Field[] = [
    { label: 'Name', value: customer.name },
    { label: 'Tax ID', value: customer.taxId ?? '—' },
    { label: 'Contact person', value: customer.contactPerson ?? '—' },
    { label: 'Phone', value: customer.phone ?? '—' },
    { label: 'Email', value: customer.email ?? '—' },
    { label: 'Address', value: customer.address ?? '—' },
    { label: 'Status', value: customer.isActive ? 'Active' : 'Inactive' },
    { label: 'Added', value: formatDate(customer.createdAt) },
    { label: 'Notes', value: customer.notes ?? '—' },
  ]

  const shipmentColumns: Columns<Shipment> = [
    {
      accessorKey: 'reference',
      header: 'Ref',
      cell: (c) => <span className="font-mono font-medium">{c.getValue<string>()}</span>,
    },
    {
      id: 'route',
      header: 'Route',
      accessorFn: (row) => `${row.originAddress} → ${row.destinationAddress}`,
      cell: (c) => (
        <div className="max-w-[240px] truncate" title={c.getValue<string>()}>
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
    { accessorKey: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.getValue<string>()} /> },
  ]

  return (
    <div className="flex flex-col gap-[18px]">
      <DetailBreadcrumb section="Customers" to="/customers" code={customer.name} />

      <DetailHeader
        glyph={initials}
        title={customer.name}
        status={
          customer.isActive ? (
            <Badge variant="outline" className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-muted text-muted-foreground border-transparent">
              Inactive
            </Badge>
          )
        }
        meta={[
          { label: 'Tax ID', value: customer.taxId ?? '—' },
          { label: 'Contact', value: customer.contactPerson ?? '—' },
          { label: 'Phone', value: customer.phone ?? '—' },
        ]}
        metrics={metrics}
        actions={
          <>
            <Button onClick={() => setShipmentOpen(true)}>
              <Plus className="size-4" /> New shipment
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            <ConfirmDelete
              title={`Delete ${customer.name}?`}
              description="A customer that still has shipments cannot be deleted — deactivate them instead."
              onConfirm={() =>
                remove.mutate(customer.id, { onSuccess: () => navigate('/customers', { replace: true }) })
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
          { id: 'shipments', label: 'Shipments', count: shipmentsQuery.data?.total ?? 0 },
        ]}
        value={tab}
        onChange={setTab}
      />

      <DetailLayout
        main={
          <>
            {tab === 'overview' && (
              <>
                <Section
                  title="Company details"
                  action={
                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="text-muted-foreground hover:text-foreground text-[12px] transition-colors"
                    >
                      Edit
                    </button>
                  }
                >
                  <FieldGrid fields={fields} />
                </Section>
                <Section title="Activity">
                  <ActivityFeed items={activity} />
                </Section>
              </>
            )}

            {tab === 'shipments' && (
              <Section title="Shipments">
                <DataTable
                  columns={shipmentColumns}
                  data={shipmentList}
                  isLoading={shipmentsQuery.isLoading}
                  emptyMessage="No shipments for this customer yet."
                  onRowClick={(shipment) => navigate(`/shipments/${shipment.id}`)}
                />
              </Section>
            )}
          </>
        }
        rail={
          <>
            <RailCard
              title="Revenue"
              hint="all time"
              items={[
                { label: 'Booked', value: formatMoney(revenue) },
                { label: 'Delivered', value: formatMoney(deliveredRevenue), tone: 'good' },
                { label: 'In progress', value: formatMoney(revenue - deliveredRevenue) },
              ]}
            />
            <RailCard
              title="Pipeline"
              items={[
                { label: 'Draft', value: byStatus('Draft') },
                { label: 'Scheduled', value: byStatus('Scheduled') },
                { label: 'In transit', value: byStatus('InTransit') },
                { label: 'Delivered', value: delivered.length },
                { label: 'Cancelled', value: byStatus('Cancelled') },
              ]}
            />
          </>
        }
      />

      <CustomerFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        companyId={customer.companyId}
      />

      <ShipmentFormSheet
        open={shipmentOpen}
        onOpenChange={setShipmentOpen}
        shipment={null}
        companyId={customer.companyId}
      />
    </div>
  )
}
