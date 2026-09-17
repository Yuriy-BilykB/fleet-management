import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { progressAlong, sliceByFraction, type LatLng } from '@/lib/polyline'
import type { TripTrack, TruckPosition } from '@/types/api'

/** Leaflet's default marker images do not survive bundling; draw our own. */
const truckIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:30px;height:30px;border-radius:50%;
    background:#2a78d6;border:3px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,.35);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-size:15px;line-height:1;">🚚</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

/** Keeps the whole route in view, and follows the truck once it starts moving. */
function FitRoute({ bounds, follow }: { bounds: L.LatLngBoundsExpression | null; follow: L.LatLngExpression | null }) {
  const map = useMap()

  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [48, 48] })
  }, [map, bounds])

  useEffect(() => {
    if (follow) map.panTo(follow, { animate: true, duration: 0.5 })
  }, [map, follow])

  return null
}

export function TripMap({
  track, live, className,
}: {
  track: TripTrack
  live: TruckPosition | null
  className?: string
}) {
  const origin = track.originLatitude !== null && track.originLongitude !== null
    ? ([track.originLatitude, track.originLongitude] as [number, number])
    : null
  const destination = track.destinationLatitude !== null && track.destinationLongitude !== null
    ? ([track.destinationLatitude, track.destinationLongitude] as [number, number])
    : null

  // The live fix wins over the last stored one, so the marker never lags.
  const newest = live ?? track.positions.at(-1) ?? null
  const progress = useMemo(
    () =>
      newest && track.routeGeometry.length >= 2
        ? progressAlong(track.routeGeometry, [newest.latitude, newest.longitude])
        : 0,
    [track.routeGeometry, newest],
  )

  // Covered path = the road itself, sliced at the current progress. Connecting the
  // recorded fixes instead would cut ~4% off the distance on bends.
  const travelled = useMemo<LatLng[]>(() => {
    if (track.routeGeometry.length >= 2) return sliceByFraction(track.routeGeometry, progress)
    const points = track.positions.map((p) => [p.latitude, p.longitude] as LatLng)
    if (live) points.push([live.latitude, live.longitude])
    return points
  }, [track.routeGeometry, track.positions, progress, live])

  const current: LatLng | null = live
    ? [live.latitude, live.longitude]
    : (travelled.at(-1) ?? null)

  const isRoadRoute = track.routeProvider === 'openrouteservice'

  const bounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    const all = [origin, destination, ...track.routeGeometry].filter(Boolean) as [number, number][]
    return all.length >= 2 ? all : null
    // Only refit when the endpoints change — not on every new fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.[0], origin?.[1], destination?.[0], destination?.[1], track.routeGeometry.length])

  if (!origin || !destination) {
    return (
      <p className="text-muted-foreground px-[18px] py-12 text-center text-sm">
        This shipment has no origin or destination city set, so there is no route to draw.
      </p>
    )
  }

  // Real road geometry when the provider answered, otherwise the A→B straight line.
  const planned: [number, number][] =
    track.routeGeometry.length >= 2 ? track.routeGeometry : [origin, destination]

  return (
    <div className={className}>
      <MapContainer
        center={origin}
        zoom={7}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Planned route — the real road when a provider answered, else the straight line. */}
        <Polyline
          positions={planned}
          pathOptions={{
            color: '#94a3b8',
            weight: 3,
            dashArray: isRoadRoute ? undefined : '6 8',
          }}
        />
        {travelled.length >= 2 && (
          <Polyline positions={travelled} pathOptions={{ color: '#2a78d6', weight: 4 }} />
        )}

        <CircleMarker center={origin} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 }}>
          <Popup>Origin — {track.originName}</Popup>
        </CircleMarker>
        {track.stops.map((stop) => (
          <CircleMarker
            key={stop.sequence}
            center={[stop.latitude, stop.longitude]}
            radius={6}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#eda100', fillOpacity: 1 }}
          >
            <Popup>
              Stop {stop.sequence} — {stop.name}
            </Popup>
          </CircleMarker>
        ))}

        <CircleMarker center={destination} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#dc2626', fillOpacity: 1 }}>
          <Popup>Destination — {track.destinationName}</Popup>
        </CircleMarker>

        {current && (
          <Marker position={current} icon={truckIcon}>
            <Popup>
              {live?.speedKmh != null ? `${live.speedKmh} km/h` : 'Position'}
              {` · ${Math.round(progress * 100)}% of route`}
            </Popup>
          </Marker>
        )}

        <FitRoute bounds={bounds} follow={current} />
      </MapContainer>
    </div>
  )
}
