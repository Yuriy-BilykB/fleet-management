using System.Text.Json;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using FleetManagement.Api.Routing;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Services;

public class RoutingService(
    AppDbContext db,
    IRouteProvider provider,
    ILogger<RoutingService> logger) : IRoutingService
{
    public async Task<RouteResult?> GetShipmentRouteAsync(Guid shipmentId, CancellationToken ct)
    {
        var shipment = await db.Shipments.AsNoTracking()
            .Include(x => x.OriginLocation)
            .Include(x => x.DestinationLocation)
            .Include(x => x.Stops.OrderBy(s => s.Sequence)).ThenInclude(s => s.Location)
            .FirstOrDefaultAsync(x => x.Id == shipmentId, ct);

        if (shipment?.OriginLocation is null || shipment.DestinationLocation is null) return null;

        var waypoints = new List<Location> { shipment.OriginLocation };
        waypoints.AddRange(shipment.Stops.OrderBy(s => s.Sequence).Select(s => s.Location));
        waypoints.Add(shipment.DestinationLocation);

        var key = string.Join('-', waypoints.Select(w => w.Id));

        var cached = await db.Routes.AsNoTracking().FirstOrDefaultAsync(x => x.RouteKey == key, ct);
        if (cached is not null) return Deserialize(cached);

        var points = waypoints.Select(w => new GeoPoint(w.Longitude, w.Latitude)).ToList();
        var fetched = await provider.GetRouteAsync(points, ct);

        if (fetched is null)
        {
            // No provider, or it failed — the straight line keeps the map usable.
            return new RouteResult(points, StraightLineKm(points), 0, "straight-line");
        }

        db.Routes.Add(new RoadRoute
        {
            RouteKey = key,
            Provider = fetched.Provider,
            DistanceKm = fetched.DistanceKm,
            DurationMinutes = fetched.DurationMinutes,
            Geometry = JsonSerializer.Serialize(
                fetched.Points.Select(p => new[] { p.Longitude, p.Latitude })),
        });

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Two requests raced for the same route; the cached row is just as good.
            logger.LogDebug("Route {Key} was cached concurrently", key);
        }

        return fetched;
    }

    private static RouteResult Deserialize(RoadRoute route)
    {
        var raw = JsonSerializer.Deserialize<List<List<double>>>(route.Geometry) ?? [];
        var points = raw.Where(c => c.Count >= 2).Select(c => new GeoPoint(c[0], c[1])).ToList();
        return new RouteResult(points, route.DistanceKm, route.DurationMinutes, route.Provider);
    }

    private static decimal StraightLineKm(IReadOnlyList<GeoPoint> points)
    {
        double total = 0;
        for (var i = 1; i < points.Count; i++)
            total += GeoMath.DistanceKm(points[i - 1], points[i]);
        return Math.Round((decimal)total, 2);
    }
}
