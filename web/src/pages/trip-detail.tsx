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
  type ActivityItem, type DetailTab, type Field, type Metric, type RailItem,
} from '@/components/detail/detail-shell'
import { trips, useTripTrack } from '@/hooks/use-resources'
import type { TripTrack, TruckPosition } from '@/types/api'
import { useTruckLivePosition } from '@/hooks/use-trip-live-position'
import { TripMap } from '@/components/map/trip-map'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime, formatMoney, formatNumber, humanize } from '@/lib/format'
import { progressAlong } from '@/lib/polyline'

/** Whole hours and minutes between two instants, or null while it is open. */
function duration(startedAt: string | null, completedAt: string | null): string | null {
  if (!startedAt || !completedAt) return null
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 0) return null
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.round((ms % 3_600_000) / 60_000)
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

/** Minutes as "4h 42m"; blank when the provider gave no duration. */
function formatMinutes(minutes: number | null | undefined): string {
  if (!minutes) return '—'
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}

/** Right-hand rail on the map tab: where the truck is and how it was routed. */
function buildTrackingItems(track: TripTrack | undefined, live: TruckPosition | null): RailItem[] {
  // The live fix is fresher than anything already stored. Progress is derived by
  // projecting it onto the route — a feed reports a position, never a percentage.
  const newest = live ?? track?.positions.at(-1)
  const progress =
    newest && track && track.routeGeometry.length >= 2
      ? progressAlong(track.routeGeometry, [newest.latitude, newest.longitude])
      : null
  const isRoadRoute = track?.routeProvider === 'openrouteservice'

  return [
    { label: 'Progress', value: progress != null ? `${Math.round(progress * 100)}%` : '—' },
    { label: 'Speed', value: live?.speedKmh != null ? `${live.speedKmh} km/h` : '—' },
    { label: 'Route', value: `${track?.originName ?? '—'} → ${track?.destinationName ?? '—'}` },
    {
      label: 'Road distance',
      value: track?.routeDistanceKm != null ? `${formatNumber(track.routeDistanceKm)} km` : '—',
    },
    { label: 'Drive time', value: formatMinutes(track?.routeDurationMinutes) },
    {
      label: 'Routing',
      value: isRoadRoute ? 'road' : 'straight line',
      tone: isRoadRoute ? 'good' : 'warn',
    },
    { label: 'Fixes recorded', value: track?.positions.length ?? 0 },
    { label: 'Last update', value: live ? formatDateTime(live.recordedAt) : '—' },
  ]
}

const tripTabs: DetailTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'map', label: 'Live map' },
]

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { companyId } = useCompany()
  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)

  const tripQuery = trips.useById(id)
  const trip = tripQuery.data
  const remove = trips.useRemove()

  const trackQuery = useTripTrack(id)
  // Positions belong to the truck, so the feed is joined by truck, not trip.
  const { position: livePosition, status: liveStatus } = useTruckLivePosition(trackQuery.data?.truckId)
  const trackingItems = buildTrackingItems(trackQuery.data, livePosition)

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
      sub: costPerKm !== null ? 'EUR per km' : 'needs distance + fuel',
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

      <DetailTabs tabs={tripTabs} value={tab} onChange={setTab} />

      <DetailLayout
        main={
          tab === 'map' ? (
            <Section
              title="Live position"
              action={
                <span className="flex items-center gap-2 text-[12px]">
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      liveStatus === 'live'
                        ? 'animate-pulse bg-emerald-500'
                        : liveStatus === 'connecting'
                          ? 'bg-amber-500'
                          : 'bg-muted-foreground/50',
                    )}
                  />
                  <span className="text-muted-foreground">
                    {liveStatus === 'live' ? 'Live' : liveStatus === 'connecting' ? 'Connecting…' : 'Offline'}
                  </span>
                </span>
              }
            >
              {trackQuery.data ? (
                <TripMap track={trackQuery.data} live={livePosition} className="h-[560px] w-full" />
              ) : (
                <Skeleton className="h-[560px] w-full rounded-none" />
              )}
            </Section>
          ) : (
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
          )
        }
        rail={
          tab === 'map' ? (
            <RailCard title="Tracking" hint={liveStatus} items={trackingItems} />
          ) : (
          <RailCard
            title="Linked records"
            items={[
              { label: 'Shipment', value: trip.shipmentReference ?? '—' },
              { label: 'Driver', value: trip.driverName ?? '—' },
              { label: 'Truck', value: trip.truckPlate ?? '—' },
            ]}
          />
          )
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
