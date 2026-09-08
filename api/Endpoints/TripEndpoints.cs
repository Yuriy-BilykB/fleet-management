using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Endpoints;

public static class TripEndpoints
{
    public static RouteGroupBuilder MapTripEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/trips").WithTags("Trips");

        group.MapGet("/", async (
            AppDbContext db, Guid? shipmentId, Guid? driverId, Guid? truckId, TripStatus? status,
            int? page, int? pageSize, CancellationToken ct) =>
        {
            var query = db.Trips.AsNoTracking()
                .Include(x => x.Shipment).Include(x => x.Driver).Include(x => x.Truck)
                .AsQueryable();

            if (shipmentId is not null) query = query.Where(x => x.ShipmentId == shipmentId);
            if (driverId is not null) query = query.Where(x => x.DriverId == driverId);
            if (truckId is not null) query = query.Where(x => x.TruckId == truckId);
            if (status is not null) query = query.Where(x => x.Status == status);

            return Results.Ok(await query.OrderByDescending(x => x.CreatedAt)
                .ToPagedResultAsync(TripResponse.From, page, pageSize, ct));
        });

        group.MapGet("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await Detailed(db.Trips.AsNoTracking()).FirstOrDefaultAsync(x => x.Id == id, ct);
            return entity is null
                ? EndpointHelpers.NotFoundProblem("Trip", id)
                : Results.Ok(TripResponse.From(entity));
        });

        group.MapPost("/", async (AppDbContext db, TripRequest request, CancellationToken ct) =>
        {
            if (await ValidateReferences(db, request, ct) is { } refProblem) return refProblem;

            var entity = new Trip();
            Apply(entity, request);

            db.Trips.Add(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.Created($"/api/trips/{entity.Id}", TripResponse.From(await Reload(db, entity.Id, ct)));
        });

        group.MapPut("/{id:guid}", async (AppDbContext db, Guid id, TripRequest request, CancellationToken ct) =>
        {
            var entity = await db.Trips.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("Trip", id);

            if (await ValidateReferences(db, request, ct) is { } refProblem) return refProblem;

            Apply(entity, request);

            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.Ok(TripResponse.From(await Reload(db, entity.Id, ct)));
        });

        group.MapDelete("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await db.Trips.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("Trip", id);

            db.Trips.Remove(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.NoContent();
        });

        return group;
    }

    private static IQueryable<Trip> Detailed(IQueryable<Trip> query) =>
        query.Include(x => x.Shipment).Include(x => x.Driver).Include(x => x.Truck);

    private static async Task<Trip> Reload(AppDbContext db, Guid id, CancellationToken ct) =>
        await Detailed(db.Trips.AsNoTracking()).FirstAsync(x => x.Id == id, ct);

    private static async Task<IResult?> ValidateReferences(AppDbContext db, TripRequest request, CancellationToken ct)
    {
        var shipment = await db.Shipments.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.ShipmentId, ct);
        if (shipment is null)
            return EndpointHelpers.ReferenceProblem($"Shipment '{request.ShipmentId}' does not exist.");

        var driver = await db.Drivers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.DriverId, ct);
        if (driver is null)
            return EndpointHelpers.ReferenceProblem($"Driver '{request.DriverId}' does not exist.");

        var truck = await db.Trucks.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.TruckId, ct);
        if (truck is null)
            return EndpointHelpers.ReferenceProblem($"Truck '{request.TruckId}' does not exist.");

        if (driver.CompanyId != shipment.CompanyId || truck.CompanyId != shipment.CompanyId)
            return EndpointHelpers.ReferenceProblem("Driver and truck must belong to the shipment's company.");

        if (request.CompletedAt is { } completed && request.StartedAt is { } started && completed < started)
            return EndpointHelpers.ReferenceProblem("CompletedAt must not be earlier than StartedAt.");

        return null;
    }

    private static void Apply(Trip entity, TripRequest request)
    {
        entity.ShipmentId = request.ShipmentId;
        entity.DriverId = request.DriverId;
        entity.TruckId = request.TruckId;
        entity.StartedAt = request.StartedAt;
        entity.CompletedAt = request.CompletedAt;
        entity.DistanceKm = request.DistanceKm;
        entity.FuelCost = request.FuelCost;
        entity.Status = request.Status;
        entity.Notes = request.Notes;
    }
}
