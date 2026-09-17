using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Services;

public class TripTrackingService(AppDbContext db, IRoutingService routing) : ITripTrackingService
{
    public async Task<ServiceResult<TripTrackResponse>> GetTrackAsync(Guid tripId, CancellationToken ct)
    {
        var trip = await db.Trips.AsNoTracking()
            .Include(x => x.Shipment).ThenInclude(x => x.OriginLocation)
            .Include(x => x.Shipment).ThenInclude(x => x.DestinationLocation)
            .Include(x => x.Shipment).ThenInclude(x => x.Stops).ThenInclude(s => s.Location)
            .FirstOrDefaultAsync(x => x.Id == tripId, ct);

        if (trip is null) return ServiceResult<TripTrackResponse>.NotFound("Trip", tripId);

        // Positions belong to the truck, so a trip's track is the slice of them
        // recorded while this trip was running.
        var from = trip.StartedAt ?? trip.CreatedAt;
        var to = trip.CompletedAt ?? DateTimeOffset.UtcNow;

        var positions = await db.TruckPositions.AsNoTracking()
            .Where(x => x.TruckId == trip.TruckId && x.RecordedAt >= from && x.RecordedAt <= to)
            .OrderBy(x => x.RecordedAt)
            .ToListAsync(ct);

        var origin = trip.Shipment.OriginLocation;
        var destination = trip.Shipment.DestinationLocation;

        var route = await routing.GetShipmentRouteAsync(trip.ShipmentId, ct);

        // Leaflet wants [lat, lon]; the provider and our cache store [lon, lat].
        var geometry = route?.Points.Select(p => new[] { p.Latitude, p.Longitude }).ToList() ?? [];

        var stops = trip.Shipment.Stops
            .OrderBy(s => s.Sequence)
            .Select(s => new TripStopResponse(s.Sequence, s.Location.Name, s.Location.Latitude, s.Location.Longitude))
            .ToList();

        return ServiceResult<TripTrackResponse>.Success(new TripTrackResponse(
            tripId,
            origin?.Latitude, origin?.Longitude, origin?.Name,
            destination?.Latitude, destination?.Longitude, destination?.Name,
            geometry,
            route?.DistanceKm,
            route?.DurationMinutes,
            route?.Provider,
            stops,
            trip.TruckId,
            positions.Select(TruckPositionResponse.From).ToList()));
    }
}
