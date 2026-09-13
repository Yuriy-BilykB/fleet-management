import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Package, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/common/status-badge'
import { ConfirmDelete } from '@/components/common/confirm-delete'
import { TripFormSheet } from '@/components/trips/trip-form-sheet'
import { useCompany } from '@/hooks/use-company'
import {
  ActivityFeed, DetailBreadcrumb, DetailHeader, DetailLayout, DetailTabs,
  FieldGrid, RailCard, Section,
  type ActivityItem, type Field, type Metric,
} from '@/components/detail/detail-shell'
import { trips } from '@/hooks/use-resources'
import { formatDate, formatDateTime, formatMoney, formatNumber, humanize } from '@/lib/format'

/** Whole hours and minutes between two instants, or null while it is open. */
function duration(startedAt: string | null, completedAt: string | null): string | null {
  if (!startedAt || !completedAt) return null
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 0) return null
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.round((ms % 3_600_000) / 60_000)
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { companyId } = useCompany()
  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)

  const tripQuery = trips.useById(id)
  const trip = tripQuery.data
  const remove = trips.useRemove()

  if (tripQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-[190px] rounded-[14px]" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!trip) {
    return (
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-medium">Trip not found</p>
        <Button render={<Link to="/trips" />}>
          <ArrowLeft className="size-4" /> Back to trips
        </Button>
      </Card>
    )
  }

  const took = duration(trip.startedAt, trip.completedAt)
  const costPerKm =
    trip.fuelCost !== null && trip.distanceKm ? trip.fuelCost / trip.distanceKm : null

  const metrics: Metric[] = [
    { label: 'Distance', value: formatNumber(trip.distanceKm), sub: 'km' },
    { label: 'Fuel cost', value: formatMoney(trip.fuelCost), sub: 'reported' },
    {
      label: 'Cost / km',
      value: costPerKm !== null ? costPerKm.toFixed(2) : '—',
      sub: costPerKm !== null ? 'UAH per km' : 'needs distance + fuel',
    },
    { label: 'Started', value: trip.startedAt ? formatDate(trip.startedAt) : '—', sub: trip.startedAt ? formatDateTime(trip.startedAt).slice(-5) : 'not started' },
    { label: 'Duration', value: took ?? '—', sub: trip.completedAt ? 'completed' : 'in progress' },
  ]

  const fields: Field[] = [
    {
      label: 'Shipment',
      value: (
        <Link to={`/shipments/${trip.shipmentId}`} className="underline-offset-4 hover:underline">
          {trip.shipmentReference ?? '—'}
        </Link>
      ),
    },
    {
      label: 'Driver',
      value: (
        <Link to={`/drivers/${trip.driverId}`} className="underline-offset-4 hover:underline">
          {trip.driverName ?? '—'}
        </Link>
      ),
    },
    {
      label: 'Truck',
      value: (
        <Link to={`/trucks/${trip.truckId}`} className="underline-offset-4 hover:underline">
          {trip.truckPlate ?? '—'}
        </Link>
      ),
    },
    { label: 'Status', value: humanize(trip.status) },
    { label: 'Started at', value: formatDateTime(trip.startedAt) },
    { label: 'Completed at', value: formatDateTime(trip.completedAt) },
    { label: 'Distance', value: formatNumber(trip.distanceKm, ' km') },
    { label: 'Fuel cost', value: formatMoney(trip.fuelCost) },
    { label: 'Created', value: formatDate(trip.createdAt) },
    { label: 'Notes', value: trip.notes ?? '—' },
  ]

  const activity: ActivityItem[] = [
    trip.completedAt && {
      id: 'completed',
      time: formatDate(trip.completedAt),
      title: 'Trip completed',
      description: took ? `Took ${took}` : undefined,
      tone: 'good' as const,
    },
    trip.startedAt && {
      id: 'started',
      time: formatDate(trip.startedAt),
      title: 'Trip started',
      description: `${trip.driverName ?? '—'} · ${trip.truckPlate ?? '—'}`,
      tone: 'info' as const,
    },
    {
      id: 'created',
      time: formatDate(trip.createdAt),
      title: 'Trip created',
      description: trip.shipmentReference ?? undefined,
      tone: 'default' as const,
    },
  ].filter(Boolean) as ActivityItem[]

  return (
    <div className="flex flex-col gap-[18px]">
      <DetailBreadcrumb section="Trips" to="/trips" code={trip.shipmentReference ?? 'Trip'} />

      <DetailHeader
        glyph="TRP"
        title={trip.shipmentReference ?? 'Trip'}
        status={<StatusBadge status={trip.status} />}
        meta={[
          { label: 'Driver', value: trip.driverName ?? '—' },
          { label: 'Truck', value: trip.truckPlate ?? '—' },
          { label: 'Started', value: formatDateTime(trip.startedAt) },
        ]}
        metrics={metrics}
        actions={
          <>
            <Button onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            <Button variant="outline" render={<Link to={`/shipments/${trip.shipmentId}`} />}>
              <Package className="size-4" /> Shipment
            </Button>
            <ConfirmDelete
              title="Delete this trip?"
              onConfirm={() =>
                remove.mutate(trip.id, { onSuccess: () => navigate('/trips', { replace: true }) })
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

      <DetailTabs tabs={[{ id: 'overview', label: 'Overview' }]} value={tab} onChange={setTab} />

      <DetailLayout
        main={
          <>
            <Section
              title="Trip details"
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
        }
        rail={
          <RailCard
            title="Linked records"
            items={[
              { label: 'Shipment', value: trip.shipmentReference ?? '—' },
              { label: 'Driver', value: trip.driverName ?? '—' },
              { label: 'Truck', value: trip.truckPlate ?? '—' },
            ]}
          />
        }
      />

      {companyId && (
        <TripFormSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          trip={trip}
          companyId={companyId}
        />
      )}
    </div>
  )
}
