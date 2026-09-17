const EARTH_RADIUS_KM = 6371

export type LatLng = [number, number]

function distanceKm([lat1, lon1]: LatLng, [lat2, lon2]: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(h))
}

/**
 * The first `fraction` of a polyline, measured by distance.
 *
 * Drawing the covered path from recorded positions instead would cut every bend:
 * fixes arrive kilometres apart while the road geometry has a point every ~150 m.
 * Slicing the road itself keeps the line exactly on the road.
 */
export function sliceByFraction(points: LatLng[], fraction: number): LatLng[] {
  if (points.length < 2) return points
  const clamped = Math.max(0, Math.min(1, fraction))
  if (clamped <= 0) return [points[0]]
  if (clamped >= 1) return points

  const legs: number[] = []
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const leg = distanceKm(points[i - 1], points[i])
    legs.push(leg)
    total += leg
  }
  if (total <= 0) return [points[0]]

  const target = clamped * total
  const result: LatLng[] = [points[0]]
  let walked = 0

  for (let i = 0; i < legs.length; i++) {
    if (walked + legs[i] >= target) {
      // Land exactly on the target point rather than snapping to the next vertex.
      const within = legs[i] <= 0 ? 0 : (target - walked) / legs[i]
      const [fromLat, fromLon] = points[i]
      const [toLat, toLon] = points[i + 1]
      result.push([
        fromLat + (toLat - fromLat) * within,
        fromLon + (toLon - fromLon) * within,
      ])
      return result
    }
    walked += legs[i]
    result.push(points[i + 1])
  }

  return result
}

/**
 * How far along a polyline a point sits, as a fraction 0–1, by snapping it to the
 * nearest segment. A telematics feed reports a position, never a percentage — so
 * progress is always derived, here and on the server.
 */
export function progressAlong(points: LatLng[], [latitude, longitude]: LatLng): number {
  if (points.length < 2) return 0

  const legs: number[] = []
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const leg = distanceKm(points[i - 1], points[i])
    legs.push(leg)
    total += leg
  }
  if (total <= 0) return 0

  let best = Number.POSITIVE_INFINITY
  let walked = 0
  let bestDistance = 0

  for (let i = 0; i < legs.length; i++) {
    const { distance, along } = snapToSegment(points[i], points[i + 1], latitude, longitude)
    if (distance < best) {
      best = distance
      bestDistance = walked + legs[i] * along
    }
    walked += legs[i]
  }

  return Math.max(0, Math.min(1, bestDistance / total))
}

/** Distance from the point to the segment, and how far along it the foot falls. */
function snapToSegment(
  [fromLat, fromLon]: LatLng,
  [toLat, toLon]: LatLng,
  latitude: number,
  longitude: number,
): { distance: number; along: number } {
  // Over a single road segment a flat projection is accurate enough and far cheaper.
  const scale = Math.cos((latitude * Math.PI) / 180)
  const dx = (toLon - fromLon) * scale
  const dy = toLat - fromLat
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared <= 0) {
    return { distance: distanceKm([fromLat, fromLon], [latitude, longitude]), along: 0 }
  }

  const t = Math.max(
    0,
    Math.min(1, ((longitude - fromLon) * scale * dx + (latitude - fromLat) * dy) / lengthSquared),
  )

  return {
    distance: distanceKm([fromLat + dy * t, fromLon + (toLon - fromLon) * t], [latitude, longitude]),
    along: t,
  }
}
