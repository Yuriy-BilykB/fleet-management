import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FileWarning, Package, Truck, UserRound, Wrench } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { StatTile } from '@/components/common/stat-tile'
import { StatusBadge } from '@/components/common/status-badge'
import { NeedsCompany } from '@/components/common/needs-company'
import { CategoryBars, ChartCard, SpendTrend, type CategoryDatum } from '@/components/common/charts'
import { useCompany } from '@/hooks/use-company'
import { useDashboard, useServiceSpend } from '@/hooks/use-resources'
import { formatDate, formatDateTime, formatMoney, humanize } from '@/lib/format'

const MONTHS_SHOWN = 6

export function DashboardPage() {
  const { companyId, company } = useCompany()
  const { data, isLoading } = useDashboard(companyId)

  // Aggregated by Postgres — the client only turns "yyyy-MM" into a short label.
  const serviceSpend = useServiceSpend(companyId, MONTHS_SHOWN)

  const spend = useMemo(
    () =>
      (serviceSpend.data ?? []).map((point) => {
        const [year, month] = point.month.split('-')
        return {
          label: new Date(Number(year), Number(month) - 1).toLocaleDateString('en', { month: 'short' }),
          value: point.total,
        }
      }),
    [serviceSpend.data],
  )

  if (!companyId) return <NeedsCompany />

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </>
    )
  }

  const fleet: CategoryDatum[] = [
    { label: 'Available', value: data.trucks.available, color: 'var(--viz-1)' },
    { label: 'On trip', value: data.trucks.onTrip, color: 'var(--viz-2)' },
    { label: 'In service', value: data.trucks.inService, color: 'var(--viz-3)' },
    {
      label: 'Other',
      value: Math.max(
        data.trucks.total - data.trucks.available - data.trucks.onTrip - data.trucks.inService,
        0,
      ),
      color: 'var(--viz-4)',
    },
  ]

  const pipeline: CategoryDatum[] = [
    { label: 'Draft', value: data.shipments.draft, color: 'var(--viz-1)' },
    { label: 'Scheduled', value: data.shipments.scheduled, color: 'var(--viz-2)' },
    { label: 'In transit', value: data.shipments.inTransit, color: 'var(--viz-3)' },
    { label: 'Delivered', value: data.shipments.delivered, color: 'var(--viz-4)' },
    { label: 'Cancelled', value: data.shipments.cancelled, color: 'var(--viz-5)' },
  ]

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={company ? `Fleet and shipment overview for ${company.name}.` : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Trucks"
          value={data.trucks.total}
          hint={`${data.trucks.available} available · ${data.trucks.onTrip} on trip`}
          icon={Truck}
        />
        <StatTile
          label="Drivers"
          value={data.drivers.total}
          hint={`${data.drivers.active} active · ${data.drivers.onTrip} on trip`}
          icon={UserRound}
        />
        <StatTile
          label="Shipments in transit"
          value={data.shipments.inTransit}
          hint={`${data.shipments.scheduled} scheduled · ${data.shipments.delivered} delivered`}
          icon={Package}
        />
        <StatTile
          label="Service spend this month"
          value={formatMoney(data.serviceCostThisMonth)}
          hint={`${data.activeCustomers} active customers`}
          icon={Wrench}
        />
      </div>

      {(data.trucks.expiringDocuments > 0 || data.drivers.expiringLicenses > 0) && (
        <Card className="flex flex-wrap items-center gap-3 border-amber-500/40 bg-amber-500/5 p-4">
          <FileWarning className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm">
            <span className="font-medium">Expiring within 30 days:</span>{' '}
            {data.trucks.expiringDocuments} truck document
            {data.trucks.expiringDocuments === 1 ? '' : 's'} · {data.drivers.expiringLicenses} driver
            licence{data.drivers.expiringLicenses === 1 ? '' : 's'}
          </p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Fleet status" description="Trucks by current status.">
          <CategoryBars data={fleet} />
        </ChartCard>

        <ChartCard title="Shipment pipeline" description="Shipments by status.">
          <CategoryBars data={pipeline} />
        </ChartCard>
      </div>

      <ChartCard
        title="Service spend"
        description={`Maintenance and repair cost per month, last ${MONTHS_SHOWN} months.`}
      >
        <SpendTrend data={spend} currency="EUR" />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 overflow-hidden py-0">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-sm font-semibold">Active trips</h2>
            <Button variant="ghost" size="sm" render={<Link to="/trips" />}>
              View all
            </Button>
          </div>
          {data.activeTrips.length === 0 ? (
            <EmptyRow>No planned or in-progress trips.</EmptyRow>
          ) : (
            <ul className="divide-y">
              {data.activeTrips.slice(0, 6).map((trip) => (
                <li key={trip.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {trip.shipmentReference ?? 'Trip'} · {trip.truckPlate ?? '—'}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {trip.driverName ?? 'Unassigned'} · {formatDateTime(trip.startedAt)}
                    </p>
                  </div>
                  <StatusBadge status={trip.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-sm font-semibold">Upcoming shipments</h2>
            <Button variant="ghost" size="sm" render={<Link to="/shipments" />}>
              View all
            </Button>
          </div>
          {data.upcomingShipments.length === 0 ? (
            <EmptyRow>Nothing scheduled.</EmptyRow>
          ) : (
            <ul className="divide-y">
              {data.upcomingShipments.slice(0, 6).map((shipment) => (
                <li key={shipment.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {shipment.reference} · {shipment.customerName ?? '—'}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {shipment.originAddress} → {shipment.destinationAddress} ·{' '}
                      {formatDateTime(shipment.pickupDate)}
                    </p>
                  </div>
                  <StatusBadge status={shipment.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {data.expiringDocuments.length > 0 && (
        <Card className="gap-0 overflow-hidden py-0">
          <div className="border-b px-5 py-4">
            <h2 className="text-sm font-semibold">Documents expiring soon</h2>
          </div>
          <ul className="divide-y">
            {data.expiringDocuments.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {humanize(doc.ownerType)} · {humanize(doc.type)}
                  </p>
                </div>
                <span className="text-sm tabular-nums text-amber-600 dark:text-amber-400">
                  {formatDate(doc.expiresOn)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground px-5 py-8 text-center text-sm">{children}</p>
}
