import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/common/status-badge'
import { ConfirmDelete } from '@/components/common/confirm-delete'
import { DataTable, type Columns } from '@/components/common/data-table'
import { TruckFormSheet } from '@/components/trucks/truck-form-sheet'
import { ServiceFormSheet } from '@/components/trucks/service-form-sheet'
import {
  ActivityFeed, DetailBreadcrumb, DetailHeader, DetailLayout, DetailTabs,
  FieldGrid, RailCard, Section,
  type ActivityItem, type Field, type Metric,
} from '@/components/detail/detail-shell'
import { documents, drivers, truckServices, trips, trucks } from '@/hooks/use-resources'
import { formatDate, formatDateTime, formatMoney, formatNumber, humanize } from '@/lib/format'
import type { DocumentRecord, Trip, TruckServiceRecord } from '@/types/api'

/** Days until a date; negative once it has passed. */
function daysUntil(value: string | null): number | null {
  if (!value) return null
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000)
}

function expiryTone(days: number | null): Metric['tone'] {
  if (days === null) return 'default'
  if (days < 0) return 'bad'
  if (days <= 30) return 'warn'
  return 'default'
}

function expiryNote(days: number | null): string {
  if (days === null) return 'not set'
  if (days < 0) return `expired ${Math.abs(days)} days ago`
  if (days <= 30) return `expires in ${days} days`
  return 'valid'
}

export function TruckDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [serviceOpen, setServiceOpen] = useState(false)

  // Read the clock once per mount so the windows below stay stable across renders.
  const [now] = useState(() => Date.now())

  const truckQuery = trucks.useById(id)
  const truck = truckQuery.data

  const tripsQuery = trips.useList({ truckId: id, pageSize: 200 }, Boolean(id))
  const servicesQuery = truckServices.useList({ truckId: id, pageSize: 200 }, Boolean(id))
  const documentsQuery = documents.useList(
    { ownerType: 'Truck', ownerId: id, pageSize: 200 },
    Boolean(id),
  )
  const driversQuery = drivers.useList({ truckId: id, pageSize: 10 }, Boolean(id))

  // Memoised: `?? []` would hand out a new array each render and defeat the
  // useMemo below (and re-render the tables for nothing).
  const tripList = useMemo(() => tripsQuery.data?.items ?? [], [tripsQuery.data])
  const serviceList = useMemo(() => servicesQuery.data?.items ?? [], [servicesQuery.data])
  const documentList = useMemo(() => documentsQuery.data?.items ?? [], [documentsQuery.data])
  const assignedDriver = driversQuery.data?.items[0]

  const remove = trucks.useRemove()

  /** Activity is derived from the records we already hold — there is no event log. */
  const activity = useMemo<ActivityItem[]>(() => {
    // `at` is the raw timestamp used for sorting; the feed only renders `time`.
    const items: (ActivityItem & { at: string })[] = [
      ...serviceList.map((s) => ({
        id: `svc-${s.id}`,
        at: s.serviceDate,
        time: formatDate(s.serviceDate),
        title: humanize(s.type),
        description: `${s.description}${s.provider ? ` · ${s.provider}` : ''}`,
        tone: 'default' as const,
      })),
      ...tripList.map((t) => ({
        id: `trip-${t.id}`,
        at: t.completedAt ?? t.startedAt ?? t.createdAt,
        time: formatDate(t.completedAt ?? t.startedAt ?? t.createdAt),
        title: t.completedAt ? 'Trip completed' : 'Trip started',
        description: `${t.shipmentReference ?? 'Trip'}${t.driverName ? ` · ${t.driverName}` : ''}`,
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

    return items
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8)
  }, [serviceList, tripList, documentList])

  if (truckQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-[190px] rounded-[14px]" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!truck) {
    return (
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-medium">Truck not found</p>
        <p className="text-muted-foreground text-sm">
          It may have been deleted, or the link points at another company.
        </p>
        <Button render={<Link to="/trucks" />}>
          <ArrowLeft className="size-4" /> Back to trucks
        </Button>
      </Card>
    )
  }

  const insuranceDays = daysUntil(truck.insuranceExpiry)
  const inspectionDays = daysUntil(truck.inspectionExpiry)

  const thirtyDaysAgo = now - 30 * 86_400_000
  const recentTrips = tripList.filter(
    (t) => new Date(t.startedAt ?? t.createdAt).getTime() >= thirtyDaysAgo,
  ).length

  const yearAgo = now - 365 * 86_400_000
  const servicesLastYear = serviceList.filter(
    (s) => new Date(s.serviceDate).getTime() >= yearAgo,
  )
  const serviceSpend = servicesLastYear.reduce((sum, s) => sum + s.cost, 0)
  const openTrips = tripList.filter((t) => t.status === 'Planned' || t.status === 'InProgress').length

  const metrics: Metric[] = [
    { label: 'Odometer', value: formatNumber(truck.odometerKm), sub: 'km' },
    { label: 'Capacity', value: formatNumber(truck.capacityKg), sub: 'kg payload' },
    {
      label: 'Insurance',
      value: truck.insuranceExpiry ? formatDate(truck.insuranceExpiry) : '—',
      sub: expiryNote(insuranceDays),
      tone: expiryTone(insuranceDays),
    },
    {
      label: 'Inspection',
      value: truck.inspectionExpiry ? formatDate(truck.inspectionExpiry) : '—',
      sub: expiryNote(inspectionDays),
      tone: expiryTone(inspectionDays),
    },
    { label: 'Trips (30d)', value: recentTrips, sub: `${openTrips} open` },
  ]

  const fields: Field[] = [
    { label: 'Make / model', value: `${truck.make} ${truck.model}` },
    { label: 'Year', value: truck.year ?? '—' },
    { label: 'Registration', value: truck.plateNumber },
    { label: 'VIN', value: truck.vin ?? '—' },
    { label: 'Capacity', value: `${formatNumber(truck.capacityKg)} kg` },
    { label: 'Odometer', value: `${formatNumber(truck.odometerKm)} km` },
    { label: 'Status', value: humanize(truck.status) },
    {
      label: 'Assigned driver',
      value: assignedDriver ? `${assignedDriver.lastName} ${assignedDriver.firstName}` : 'Unassigned',
    },
    {
      label: 'Insurance expiry',
      value: truck.insuranceExpiry ? formatDate(truck.insuranceExpiry) : '—',
      tone: expiryTone(insuranceDays),
    },
    {
      label: 'Inspection expiry',
      value: truck.inspectionExpiry ? formatDate(truck.inspectionExpiry) : '—',
      tone: expiryTone(inspectionDays),
    },
    { label: 'Added', value: formatDate(truck.createdAt) },
    { label: 'Notes', value: truck.notes ?? '—' },
  ]

  const tripColumns: Columns<Trip> = [
    {
      accessorKey: 'shipmentReference',
      header: 'Shipment',
      cell: (c) => <span className="font-mono font-medium">{c.getValue<string | null>() ?? '—'}</span>,
    },
    { accessorKey: 'driverName', header: 'Driver', cell: (c) => c.getValue<string | null>() ?? '—' },
    {
      accessorKey: 'startedAt',
      header: 'Started',
      cell: (c) => <span className="tabular-nums">{formatDateTime(c.getValue<string | null>())}</span>,
    },
    {
      accessorKey: 'distanceKm',
      header: 'Distance',
      cell: (c) => <span className="tabular-nums">{formatNumber(c.getValue<number | null>(), ' km')}</span>,
    },
    { accessorKey: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.getValue<string>()} /> },
  ]

  const serviceColumns: Columns<TruckServiceRecord> = [
    {
      accessorKey: 'serviceDate',
      header: 'Date',
      cell: (c) => <span className="tabular-nums">{formatDate(c.getValue<string>())}</span>,
    },
    { accessorKey: 'type', header: 'Type', cell: (c) => humanize(c.getValue<string>()) },
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
      accessorKey: 'odometerKm',
      header: 'Odometer',
      cell: (c) => <span className="tabular-nums">{formatNumber(c.getValue<number | null>(), ' km')}</span>,
    },
    {
      accessorKey: 'cost',
      header: 'Cost',
      cell: (c) => (
        <span className="tabular-nums">{formatMoney(c.getValue<number>(), c.row.original.currency)}</span>
      ),
    },
  ]

  const documentColumns: Columns<DocumentRecord> = [
    {
      accessorKey: 'title',
      header: 'Document',
      cell: (c) => <span className="font-medium">{c.getValue<string>()}</span>,
    },
    { accessorKey: 'type', header: 'Type', cell: (c) => humanize(c.getValue<string>()) },
    {
      accessorKey: 'expiresOn',
      header: 'Valid until',
      cell: (c) => {
        const value = c.getValue<string | null>()
        const days = daysUntil(value)
        return (
          <span
            className={
              days !== null && days < 0
                ? 'text-red-600 tabular-nums dark:text-red-400'
                : days !== null && days <= 30
                  ? 'text-amber-600 tabular-nums dark:text-amber-400'
                  : 'tabular-nums'
            }
          >
            {formatDate(value)}
          </span>
        )
      },
    },
    { accessorKey: 'number', header: 'Number', cell: (c) => c.getValue<string | null>() ?? '—' },
  ]

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'trips', label: 'Trips', count: tripsQuery.data?.total ?? 0 },
    { id: 'services', label: 'Services', count: servicesQuery.data?.total ?? 0 },
    { id: 'documents', label: 'Documents', count: documentsQuery.data?.total ?? 0 },
  ]

  return (
    <div className="flex flex-col gap-[18px]">
      <DetailBreadcrumb section="Trucks" to="/trucks" code={truck.plateNumber} />

      <DetailHeader
        glyph="TRK"
        title={truck.plateNumber}
        status={<StatusBadge status={truck.status} />}
        meta={[
          { label: 'Vehicle', value: `${truck.make} ${truck.model}${truck.year ? ` · ${truck.year}` : ''}` },
          {
            label: 'Driver',
            value: assignedDriver
              ? `${assignedDriver.lastName} ${assignedDriver.firstName}`
              : 'Unassigned',
          },
          { label: 'VIN', value: truck.vin ?? '—' },
        ]}
        metrics={metrics}
        actions={
          <>
            <Button onClick={() => setServiceOpen(true)}>
              <Wrench className="size-4" /> Log service
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            <ConfirmDelete
              title={`Delete ${truck.plateNumber}?`}
              description="Service records and documents for this truck are deleted too. A truck used by a trip cannot be deleted."
              onConfirm={() =>
                remove.mutate(truck.id, { onSuccess: () => navigate('/trucks', { replace: true }) })
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

      <DetailTabs tabs={tabs} value={tab} onChange={setTab} />

      <DetailLayout
        main={
          <>
            {tab === 'overview' && (
              <>
                <Section
                  title="Vehicle details"
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

            {tab === 'trips' && (
              <Section title="Trips">
                <DataTable
                  columns={tripColumns}
                  data={tripList}
                  isLoading={tripsQuery.isLoading}
                  emptyMessage="This truck has not been on a trip yet."
                />
              </Section>
            )}

            {tab === 'services' && (
              <Section
                title="Service history"
                action={
                  <button
                    type="button"
                    onClick={() => setServiceOpen(true)}
                    className="text-muted-foreground hover:text-foreground text-[12px] transition-colors"
                  >
                    Add
                  </button>
                }
              >
                <DataTable
                  columns={serviceColumns}
                  data={serviceList}
                  isLoading={servicesQuery.isLoading}
                  emptyMessage="No maintenance or repairs recorded."
                />
              </Section>
            )}

            {tab === 'documents' && (
              <Section title="Documents">
                <DataTable
                  columns={documentColumns}
                  data={documentList}
                  isLoading={documentsQuery.isLoading}
                  emptyMessage="No documents attached to this truck."
                />
              </Section>
            )}
          </>
        }
        rail={
          <>
            <RailCard
              title="Compliance"
              hint={
                [insuranceDays, inspectionDays].filter((d) => d !== null && d <= 30).length > 0
                  ? 'needs attention'
                  : 'all valid'
              }
              items={[
                {
                  label: 'Insurance',
                  value: truck.insuranceExpiry ? formatDate(truck.insuranceExpiry) : 'not set',
                  tone: expiryTone(insuranceDays),
                },
                {
                  label: 'Tech inspection',
                  value: truck.inspectionExpiry ? formatDate(truck.inspectionExpiry) : 'not set',
                  tone: expiryTone(inspectionDays),
                },
              ]}
            />

            <RailCard
              title="Linked records"
              items={[
                { label: 'Open trips', value: openTrips },
                { label: 'Trips total', value: tripsQuery.data?.total ?? 0 },
                { label: 'Services (12m)', value: servicesLastYear.length },
                { label: 'Service spend (12m)', value: formatMoney(serviceSpend) },
                { label: 'Documents', value: documentsQuery.data?.total ?? 0 },
              ]}
            />
          </>
        }
      />

      <TruckFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        truck={truck}
        companyId={truck.companyId}
      />

      <ServiceFormSheet open={serviceOpen} onOpenChange={setServiceOpen} truckId={truck.id} />
    </div>
  )
}
