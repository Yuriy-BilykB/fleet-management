import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Truck as TruckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/common/status-badge'
import { ConfirmDelete } from '@/components/common/confirm-delete'
import { DataTable, type Columns } from '@/components/common/data-table'
import { DriverFormSheet } from '@/components/drivers/driver-form-sheet'
import {
  ActivityFeed, DetailBreadcrumb, DetailHeader, DetailLayout, DetailTabs,
  FieldGrid, RailCard, Section,
  type ActivityItem, type Field, type Metric,
} from '@/components/detail/detail-shell'
import { documents, drivers, trips } from '@/hooks/use-resources'
import { daysUntil, expiryNote, expiryTone } from '@/lib/expiry'
import { formatDate, formatDateTime, formatMoney, formatNumber, humanize } from '@/lib/format'
import type { DocumentRecord, Trip } from '@/types/api'

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [now] = useState(() => Date.now())
  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)

  const driverQuery = drivers.useById(id)
  const driver = driverQuery.data

  const tripsQuery = trips.useList({ driverId: id, pageSize: 200 }, Boolean(id))
  const documentsQuery = documents.useList(
    { ownerType: 'Driver', ownerId: id, pageSize: 200 },
    Boolean(id),
  )

  const tripList = useMemo(() => tripsQuery.data?.items ?? [], [tripsQuery.data])
  const documentList = useMemo(() => documentsQuery.data?.items ?? [], [documentsQuery.data])
  const remove = drivers.useRemove()

  const activity = useMemo<ActivityItem[]>(() => {
    const items: (ActivityItem & { at: string })[] = [
      ...tripList.map((t) => ({
        id: `trip-${t.id}`,
        at: t.completedAt ?? t.startedAt ?? t.createdAt,
        time: formatDate(t.completedAt ?? t.startedAt ?? t.createdAt),
        title: t.completedAt ? 'Trip completed' : 'Trip started',
        description: `${t.shipmentReference ?? 'Trip'}${t.truckPlate ? ` · ${t.truckPlate}` : ''}`,
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
  }, [tripList, documentList])

  if (driverQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-[190px] rounded-[14px]" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!driver) {
    return (
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-medium">Driver not found</p>
        <Button render={<Link to="/drivers" />}>
          <ArrowLeft className="size-4" /> Back to drivers
        </Button>
      </Card>
    )
  }

  const fullName = `${driver.lastName} ${driver.firstName}`
  const initials = `${driver.firstName[0] ?? ''}${driver.lastName[0] ?? ''}`.toUpperCase()
  const licenseDays = daysUntil(driver.licenseExpiry)

  const thirtyDaysAgo = now - 30 * 86_400_000
  const recent = tripList.filter((t) => new Date(t.startedAt ?? t.createdAt).getTime() >= thirtyDaysAgo)
  const recentDistance = recent.reduce((sum, t) => sum + (t.distanceKm ?? 0), 0)
  const totalDistance = tripList.reduce((sum, t) => sum + (t.distanceKm ?? 0), 0)
  const totalFuel = tripList.reduce((sum, t) => sum + (t.fuelCost ?? 0), 0)
  const openTrips = tripList.filter((t) => t.status === 'Planned' || t.status === 'InProgress').length

  const metrics: Metric[] = [
    { label: 'Trips (30d)', value: recent.length, sub: `${openTrips} open` },
    { label: 'Distance (30d)', value: formatNumber(recentDistance), sub: 'km driven' },
    {
      label: 'Licence expiry',
      value: driver.licenseExpiry ? formatDate(driver.licenseExpiry) : '—',
      sub: expiryNote(licenseDays),
      tone: expiryTone(licenseDays),
    },
    { label: 'Hired', value: driver.hiredOn ? formatDate(driver.hiredOn) : '—', sub: 'start date' },
    { label: 'Trips total', value: tripsQuery.data?.total ?? 0, sub: `${formatNumber(totalDistance)} km` },
  ]

  const fields: Field[] = [
    { label: 'Full name', value: fullName },
    { label: 'Phone', value: driver.phone ?? '—' },
    { label: 'Email', value: driver.email ?? '—' },
    { label: 'Licence number', value: driver.licenseNumber },
    {
      label: 'Licence expiry',
      value: driver.licenseExpiry ? formatDate(driver.licenseExpiry) : '—',
      tone: expiryTone(licenseDays),
    },
    { label: 'Hired on', value: driver.hiredOn ? formatDate(driver.hiredOn) : '—' },
    { label: 'Status', value: humanize(driver.status) },
    {
      label: 'Assigned truck',
      value: driver.assignedTruckId ? (
        <Link to={`/trucks/${driver.assignedTruckId}`} className="underline-offset-4 hover:underline">
          {driver.assignedTruckPlate}
        </Link>
      ) : (
        'Unassigned'
      ),
    },
    { label: 'Added', value: formatDate(driver.createdAt) },
    { label: 'Notes', value: driver.notes ?? '—' },
  ]

  const tripColumns: Columns<Trip> = [
    {
      accessorKey: 'shipmentReference',
      header: 'Shipment',
      cell: (c) => <span className="font-mono font-medium">{c.getValue<string | null>() ?? '—'}</span>,
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
      <DetailBreadcrumb section="Drivers" to="/drivers" code={fullName} />

      <DetailHeader
        glyph={initials}
        title={fullName}
        status={<StatusBadge status={driver.status} />}
        meta={[
          { label: 'Licence', value: driver.licenseNumber },
          { label: 'Truck', value: driver.assignedTruckPlate ?? 'Unassigned' },
          { label: 'Phone', value: driver.phone ?? '—' },
        ]}
        metrics={metrics}
        actions={
          <>
            <Button onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            {driver.assignedTruckId && (
              <Button variant="outline" render={<Link to={`/trucks/${driver.assignedTruckId}`} />}>
                <TruckIcon className="size-4" /> Truck
              </Button>
            )}
            <ConfirmDelete
              title={`Delete ${fullName}?`}
              description="A driver assigned to a trip cannot be deleted."
              onConfirm={() =>
                remove.mutate(driver.id, { onSuccess: () => navigate('/drivers', { replace: true }) })
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
          { id: 'trips', label: 'Trips', count: tripsQuery.data?.total ?? 0 },
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
                  title="Driver details"
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
                  emptyMessage="This driver has not been on a trip yet."
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
                  emptyMessage="No documents attached to this driver."
                />
              </Section>
            )}
          </>
        }
        rail={
          <>
            <RailCard
              title="Compliance"
              hint={licenseDays !== null && licenseDays <= 30 ? 'needs attention' : 'all valid'}
              items={[
                {
                  label: 'Driving licence',
                  value: driver.licenseExpiry ? formatDate(driver.licenseExpiry) : 'not set',
                  tone: expiryTone(licenseDays),
                },
                { label: 'Documents on file', value: documentsQuery.data?.total ?? 0 },
              ]}
            />
            <RailCard
              title="Linked records"
              items={[
                { label: 'Open trips', value: openTrips },
                { label: 'Trips total', value: tripsQuery.data?.total ?? 0 },
                { label: 'Distance total', value: `${formatNumber(totalDistance)} km` },
                { label: 'Fuel cost total', value: formatMoney(totalFuel) },
              ]}
            />
          </>
        }
      />

      <DriverFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        driver={driver}
        companyId={driver.companyId}
      />
    </div>
  )
}
