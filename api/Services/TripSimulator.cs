using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using FleetManagement.Api.Hubs;
using FleetManagement.Api.Routing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Services;

/// <summary>
/// Stands in for a telematics feed: walks the truck of every in-progress trip along
/// its shipment's road route and publishes fixes the same way a real provider would
/// — per vehicle, with no notion of "progress". Enabled by <c>Simulation:Enabled</c>.
/// </summary>
public class TripSimulator(
    IServiceScopeFactory scopeFactory,
    IHubContext<TripTrackingHub> hub,
    IConfiguration configuration,
    ILogger<TripSimulator> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!configuration.GetValue("Simulation:Enabled", false))
        {
            logger.LogInformation("Trip simulator disabled");
            return;
        }

        var tick = TimeSpan.FromSeconds(configuration.GetValue("Simulation:TickSeconds", 3));
        var routeMinutes = configuration.GetValue("Simulation:RouteMinutes", 4.0);
        var step = tick.TotalMinutes / routeMinutes;

        logger.LogInformation(
            "Trip simulator running: tick {Tick}s, a full route takes {Minutes} min",
            tick.TotalSeconds, routeMinutes);

        using var timer = new PeriodicTimer(tick);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await AdvanceAsync(step, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // One bad tick must not kill the loop.
                logger.LogError(ex, "Simulator tick failed");
            }
        }
    }

    private async Task AdvanceAsync(double step, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var routing = scope.ServiceProvider.GetRequiredService<IRoutingService>();

        var trips = await db.Trips.AsNoTracking()
            .Where(x => x.Status == TripStatus.InProgress
                && x.Shipment.OriginLocationId != null
                && x.Shipment.DestinationLocationId != null)
            .Select(x => new { x.Id, x.ShipmentId, x.TruckId, x.StartedAt, x.CreatedAt })
            .ToListAsync(ct);

        foreach (var trip in trips)
        {
            var route = await routing.GetShipmentRouteAsync(trip.ShipmentId, ct);
            if (route is null || route.Points.Count < 2) continue;

            var since = trip.StartedAt ?? trip.CreatedAt;
            var last = await db.TruckPositions.AsNoTracking()
                .Where(x => x.TruckId == trip.TruckId && x.RecordedAt >= since)
                .OrderByDescending(x => x.RecordedAt)
                .FirstOrDefaultAsync(ct);

            // Progress is derived from the last fix, exactly as it would be for a real
            // feed — the provider reports a position, never a percentage.
            var previous = last is null
                ? 0
                : GeoMath.ProgressAlong(route.Points, last.Latitude, last.Longitude);

            if (last is not null && previous >= 1) continue;   // arrived: stop writing

            var progress = Math.Min(previous + step, 1.0);
            var (latitude, longitude, bearing) = GeoMath.Along(route.Points, progress);

            var position = new TruckPosition
            {
                TruckId = trip.TruckId,
                Latitude = latitude,
                Longitude = longitude,
                HeadingDeg = Math.Round(bearing, 1),
                // Wall-clock speed would be absurd — the sim compresses hours into minutes.
                SpeedKmh = progress >= 1 ? 0 : Math.Round(78 + Random.Shared.NextDouble() * 14, 1),
                Source = "simulator",
                RecordedAt = DateTimeOffset.UtcNow
            };

            db.TruckPositions.Add(position);
            await db.SaveChangesAsync(ct);

            if (progress >= 1)
                logger.LogInformation(
                    "Trip {TripId} arrived after {Km} km ({Provider})",
                    trip.Id, route.DistanceKm, route.Provider);

            await hub.Clients.Group(TripTrackingHub.GroupFor(trip.TruckId))
                .SendAsync("position", TruckPositionResponse.From(position), ct);
        }
    }
}
