import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/common/status-badge'
import { ConfirmDelete } from '@/components/common/confirm-delete'
import { DataTable, type Columns } from '@/components/common/data-table'
import { ShipmentFormSheet } from '@/components/shipments/shipment-form-sheet'
import { AssignSheet } from '@/components/shipments/assign-sheet'
import { ShipmentStops } from '@/components/shipments/shipment-stops'
import {
  ActivityFeed, DetailBreadcrumb, DetailHeader, DetailLayout, DetailTabs,
  FieldGrid, RailCard, Section,
  type ActivityItem, type Field, type Metric,
} from '@/components/detail/detail-shell'
import { documents, shipments } from '@/hooks/use-resources'
import { api } from '@/lib/api'
import { daysUntil } from '@/lib/expiry'
import { formatDate, formatDateTime, formatMoney, formatNumber, humanize } from '@/lib/format'
import type { DocumentRecord, Trip } from '@/types/api'

export function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)

  const shipmentQuery = shipments.useById(id)
  const shipment = shipmentQuery.data

  // The API exposes a shipment's trips directly — no client-side filtering needed.
  const tripsQuery = useQuery({
    queryKey: ['shipments', 'trips', id],
    queryFn: ({ signal }) => api.get<Trip[]>(`/shipments/${id}/trips`, { signal }),
    enabled: Boolean(id),
  })

  const documentsQuery = documents.useList(
    { ownerType: 'Shipment', ownerId: id, pageSize: 200 },
    Boolean(id),
  )

  const tripList = useMemo(() => tripsQuery.data ?? [], [tripsQuery.data])
  const documentList = useMemo(() => documentsQuery.data?.items ?? [], [documentsQuery.data])
  const remove = shipments.useRemove()

  const activity = useMemo<ActivityItem[]>(() => {
    if (!shipment) return []
    const items: (ActivityItem & { at: string })[] = [
      {
        id: 'created',
        at: shipment.createdAt,
        time: formatDate(shipment.createdAt),
        title: 'Shipment created',
        description: shipment.reference,
        tone: 'default',
      },
      ...tripList.map((t) => ({
        id: `trip-${t.id}`,
        at: t.startedAt ?? t.createdAt,
        time: formatDate(t.startedAt ?? t.createdAt),
        title: t.completedAt ? 'Trip completed' : 'Assigned to trip',
        description: `${t.driverName ?? '—'} · ${t.truckPlate ?? '—'}`,
        tone: (t.status === 'Cancelled' ? 'bad' : t.completedAt ? 'good' : 'info') as ActivityItem['tone'],
      })),
      ...documentList.map((d) => ({
        id: `doc-${d.id}`,
        at: d.createdAt,
        time: formatDate(d.createdAt),
        title: 'Document added',
        description: `${d.title} · ${humanize(d.type)}`,
        tone: 'default' as const,
      })),
    ]
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8)
  }, [shipment, tripList, documentList])

  if (shipmentQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-[190px] rounded-[14px]" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!shipment) {
    return (
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-medium">Shipment not found</p>
        <Button render={<Link to="/shipments" />}>
          <ArrowLeft className="size-4" /> Back to shipments
        </Button>
      </Card>
    )
  }

  const pickupDays = daysUntil(shipment.pickupDate)
  const activeTrip = tripList.find((t) => t.status === 'Planned' || t.status === 'InProgress')
  const distance = tripList.reduce((sum, t) => sum + (t.distanceKm ?? 0), 0)
  const fuel = tripList.reduce((sum, t) => sum + (t.fuelCost ?? 0), 0)

  const metrics: Metric[] = [
    { label: 'Weight', value: formatNumber(shipment.weightKg), sub: 'kg cargo' },
    {
      label: 'Price',
      value: shipment.price !== null ? formatMoney(shipment.price, shipment.currency) : '—',
      sub: shipment.currency,
    },
    {
      label: 'Pickup',
      value: formatDate(shipment.pickupDate),
      sub:
        pickupDays === null
          ? ''
          : pickupDays < 0
            ? 'past'
            : pickupDays === 0
              ? 'today'
              : `in ${pickupDays} days`,
      tone: pickupDays !== null && pickupDays >= 0 && pickupDays <= 2 ? 'warn' : 'default',
    },
    {
      label: 'Delivery',
      value: shipment.deliveryDate ? formatDate(shipment.deliveryDate) : '—',
      sub: shipment.deliveryDate ? 'planned' : 'not set',
    },
    { label: 'Trips', value: tripList.length, sub: activeTrip ? 'one active' : 'none active' },
  ]

  const fields: Field[] = [
    { label: 'Reference', value: shipment.reference },
    {
      label: 'Customer',
      value: (
        <Link to={`/customers/${shipment.customerId}`} className="underline-offset-4 hover:underline">
          {shipment.customerName ?? '—'}
        </Link>
      ),
    },
    { label: 'Origin', value: shipment.originAddress },
    { label: 'Destination', value: shipment.destinationAddress },
    { label: 'Cargo', value: shipment.cargoDescription },
    { label: 'Weight', value: `${formatNumber(shipment.weightKg)} kg` },
    { label: 'Price', value: formatMoney(shipment.price, shipment.currency) },
    { label: 'Status', value: humanize(shipment.status) },
    { label: 'Pickup', value: formatDateTime(shipment.pickupDate) },
    { label: 'Delivery', value: formatDateTime(shipment.deliveryDate) },
    { label: 'Created', value: formatDate(shipment.createdAt) },
    { label: 'Notes', value: shipment.notes ?? '—' },
  ]

  const tripColumns: Columns<Trip> = [
    {
      accessorKey: 'driverName',
      header: 'Driver',
      cell: (c) => c.getValue<string | null>() ?? '—',
    },
    {
      accessorKey: 'truckPlate',
      header: 'Truck',
      cell: (c) => <span className="font-mono">{c.getValue<string | null>() ?? '—'}</span>,
    },
    {
      accessorKey: 'startedAt',
      header: 'Started',
      cell: (c) => <span className="tabular-nums">{formatDateTime(c.getValue<string | null>())}</span>,
    },
    {
      accessorKey: 'completedAt',
      header: 'Completed',
      cell: (c) => <span className="tabular-nums">{formatDateTime(c.getValue<string | null>())}</span>,
    },
    {
      accessorKey: 'distanceKm',
      header: 'Distance',
      cell: (c) => <span className="tabular-nums">{formatNumber(c.getValue<number | null>(), ' km')}</span>,
    },
    { accessorKey: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.getValue<string>()} /> },
  ]

  const documentColumns: Columns<DocumentRecord> = [
    { accessorKey: 'title', header: 'Document', cell: (c) => <span className="font-medium">{c.getValue<string>()}</span> },
    { accessorKey: 'type', header: 'Type', cell: (c) => humanize(c.getValue<string>()) },
    {
      accessorKey: 'expiresOn',
      header: 'Valid until',
      cell: (c) => <span className="tabular-nums">{formatDate(c.getValue<string | null>())}</span>,
    },
    { accessorKey: 'number', header: 'Number', cell: (c) => c.getValue<string | null>() ?? '—' },
  ]

  return (
    <div className="flex flex-col gap-[18px]">
      <DetailBreadcrumb section="Shipments" to="/shipments" code={shipment.reference} />

      <DetailHeader
        glyph="SHP"
        title={shipment.reference}
        status={<StatusBadge status={shipment.status} />}
        meta={[
          { label: 'Customer', value: shipment.customerName ?? '—' },
          { label: 'Route', value: `${shipment.originAddress} → ${shipment.destinationAddress}` },
          { label: 'Cargo', value: shipment.cargoDescription },
        ]}
        metrics={metrics}
        actions={
          <>
            <Button onClick={() => setAssignOpen(true)}>
              <UserPlus className="size-4" /> Assign
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            <ConfirmDelete
              title={`Delete ${shipment.reference}?`}
              description="Trips created for this shipment are deleted along with it."
              onConfirm={() =>
                remove.mutate(shipment.id, { onSuccess: () => navigate('/shipments', { replace: true }) })
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
          { id: 'trips', label: 'Trips', count: tripList.length },
          { id: 'documents', label: 'Documents', count: documentsQuery.data?.total ?? 0 },
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
                  title="Shipment details"
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
                <ShipmentStops shipmentId={shipment.id} />
                <Section title="Activity">
                  <ActivityFeed items={activity} />
                </Section>
              </>
            )}

            {tab === 'trips' && (
              <Section
                title="Trips"
                action={
                  <button
                    type="button"
                    onClick={() => setAssignOpen(true)}
                    className="text-muted-foreground hover:text-foreground text-[12px] transition-colors"
                  >
                    Assign
                  </button>
                }
              >
                <DataTable
                  columns={tripColumns}
                  data={tripList}
                  isLoading={tripsQuery.isLoading}
                  emptyMessage="No driver or truck assigned yet."
                  onRowClick={(trip) => navigate(`/trips/${trip.id}`)}
                />
              </Section>
            )}

            {tab === 'documents' && (
              <Section title="Documents">
                <DataTable
                  columns={documentColumns}
                  data={documentList}
                  isLoading={documentsQuery.isLoading}
                  emptyMessage="No documents attached to this shipment."
                />
              </Section>
            )}
          </>
        }
        rail={
          <>
            <RailCard
              title="Assignment"
              hint={activeTrip ? 'active' : 'unassigned'}
              items={[
                { label: 'Driver', value: activeTrip?.driverName ?? '—' },
                { label: 'Truck', value: activeTrip?.truckPlate ?? '—' },
                { label: 'Trip status', value: activeTrip ? humanize(activeTrip.status) : '—' },
              ]}
            />
            <RailCard
              title="Totals"
              items={[
                { label: 'Distance', value: distance ? `${formatNumber(distance)} km` : '—' },
                { label: 'Fuel cost', value: fuel ? formatMoney(fuel) : '—' },
                { label: 'Documents', value: documentsQuery.data?.total ?? 0 },
              ]}
            />
          </>
        }
      />

      <ShipmentFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        shipment={shipment}
        companyId={shipment.companyId}
      />

      <AssignSheet
        open={assignOpen}
        onOpenChange={setAssignOpen}
        shipmentId={shipment.id}
        shipmentReference={shipment.reference}
        companyId={shipment.companyId}
      />
    </div>
  )
}
