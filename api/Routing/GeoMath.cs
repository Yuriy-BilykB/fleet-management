namespace FleetManagement.Api.Routing;

public static class GeoMath
{
    private const double EarthRadiusKm = 6371.0;

    public static double DistanceKm(GeoPoint a, GeoPoint b) =>
        DistanceKm(a.Latitude, a.Longitude, b.Latitude, b.Longitude);

    public static double DistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var h = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
            + Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2))
            * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return EarthRadiusKm * 2 * Math.Atan2(Math.Sqrt(h), Math.Sqrt(1 - h));
    }

    public static double Bearing(double lat1, double lon1, double lat2, double lon2)
    {
        var dLon = ToRadians(lon2 - lon1);
        var y = Math.Sin(dLon) * Math.Cos(ToRadians(lat2));
        var x = Math.Cos(ToRadians(lat1)) * Math.Sin(ToRadians(lat2))
            - Math.Sin(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) * Math.Cos(dLon);
        return (ToDegrees(Math.Atan2(y, x)) + 360) % 360;
    }

    /// <summary>
    /// Point at <paramref name="fraction"/> of the way along a polyline, measured by
    /// distance rather than by index — so the truck moves at a steady speed.
    /// </summary>
    public static (double Latitude, double Longitude, double Bearing) Along(
        IReadOnlyList<GeoPoint> points, double fraction)
    {
        if (points.Count == 0) return (0, 0, 0);
        if (points.Count == 1) return (points[0].Latitude, points[0].Longitude, 0);

        var legs = new double[points.Count - 1];
        double total = 0;
        for (var i = 1; i < points.Count; i++)
        {
            legs[i - 1] = DistanceKm(points[i - 1], points[i]);
            total += legs[i - 1];
        }

        if (total <= 0) return (points[0].Latitude, points[0].Longitude, 0);

        var target = Math.Clamp(fraction, 0, 1) * total;
        double walked = 0;

        for (var i = 0; i < legs.Length; i++)
        {
            if (walked + legs[i] >= target || i == legs.Length - 1)
            {
                var within = legs[i] <= 0 ? 0 : (target - walked) / legs[i];
                within = Math.Clamp(within, 0, 1);

                var from = points[i];
                var to = points[i + 1];
                return (
                    from.Latitude + (to.Latitude - from.Latitude) * within,
                    from.Longitude + (to.Longitude - from.Longitude) * within,
                    Bearing(from.Latitude, from.Longitude, to.Latitude, to.Longitude));
            }

            walked += legs[i];
        }

        var last = points[^1];
        return (last.Latitude, last.Longitude, 0);
    }

    /// <summary>
    /// How far along a polyline a point sits, as a fraction 0–1, by snapping it to the
    /// nearest segment. This is how progress is derived from a raw GPS fix — a real
    /// feed reports a position, never a percentage.
    /// </summary>
    public static double ProgressAlong(IReadOnlyList<GeoPoint> points, double latitude, double longitude)
    {
        if (points.Count < 2) return 0;

        var legs = new double[points.Count - 1];
        double total = 0;
        for (var i = 1; i < points.Count; i++)
        {
            legs[i - 1] = DistanceKm(points[i - 1], points[i]);
            total += legs[i - 1];
        }
        if (total <= 0) return 0;

        var best = double.MaxValue;
        double walked = 0, bestDistance = 0;

        for (var i = 0; i < legs.Length; i++)
        {
            var (snapped, along) = SnapToSegment(points[i], points[i + 1], latitude, longitude);
            if (snapped < best)
            {
                best = snapped;
                bestDistance = walked + legs[i] * along;
            }
            walked += legs[i];
        }

        return Math.Clamp(bestDistance / total, 0, 1);
    }

    /// <summary>Distance from the point to the segment, and how far along it the foot falls.</summary>
    private static (double Distance, double Along) SnapToSegment(
        GeoPoint from, GeoPoint to, double latitude, double longitude)
    {
        // Over a single road segment a flat projection is accurate enough and far cheaper.
        var scale = Math.Cos(ToRadians(latitude));
        var dx = (to.Longitude - from.Longitude) * scale;
        var dy = to.Latitude - from.Latitude;
        var lengthSquared = dx * dx + dy * dy;

        if (lengthSquared <= 0)
            return (DistanceKm(from.Latitude, from.Longitude, latitude, longitude), 0);

        var t = Math.Clamp(
            ((longitude - from.Longitude) * scale * dx + (latitude - from.Latitude) * dy) / lengthSquared,
            0, 1);

        var footLat = from.Latitude + dy * t;
        var footLon = from.Longitude + (to.Longitude - from.Longitude) * t;

        return (DistanceKm(footLat, footLon, latitude, longitude), t);
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180;
    private static double ToDegrees(double radians) => radians * 180 / Math.PI;
}
