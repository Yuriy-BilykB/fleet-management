using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Endpoints;

public static class ShipmentEndpoints
{
    public static RouteGroupBuilder MapShipmentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/shipments").WithTags("Shipments");

        group.MapGet("/", async (
            AppDbContext db, Guid? companyId, Guid? customerId, ShipmentStatus? status, string? search,
            DateTimeOffset? pickupFrom, DateTimeOffset? pickupTo,
            int? page, int? pageSize, CancellationToken ct) =>
        {
            var query = db.Shipments.AsNoTracking().Include(x => x.Customer).AsQueryable();

            if (companyId is not null) query = query.Where(x => x.CompanyId == companyId);
            if (customerId is not null) query = query.Where(x => x.CustomerId == customerId);
            if (status is not null) query = query.Where(x => x.Status == status);
            if (pickupFrom is not null) query = query.Where(x => x.PickupDate >= pickupFrom);
            if (pickupTo is not null) query = query.Where(x => x.PickupDate <= pickupTo);
            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(x =>
                    EF.Functions.ILike(x.Reference, $"%{search}%") ||
                    EF.Functions.ILike(x.OriginAddress, $"%{search}%") ||
                    EF.Functions.ILike(x.DestinationAddress, $"%{search}%") ||
                    EF.Functions.ILike(x.CargoDescription, $"%{search}%"));

            return Results.Ok(await query.OrderByDescending(x => x.PickupDate)
                .ToPagedResultAsync(ShipmentResponse.From, page, pageSize, ct));
        });

        group.MapGet("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await db.Shipments.AsNoTracking().Include(x => x.Customer)
                .FirstOrDefaultAsync(x => x.Id == id, ct);
            return entity is null
                ? EndpointHelpers.NotFoundProblem("Shipment", id)
                : Results.Ok(ShipmentResponse.From(entity));
        });

        group.MapPost("/", async (AppDbContext db, ShipmentRequest request, CancellationToken ct) =>
        {
            if (await ValidateReferences(db, request, ct) is { } refProblem) return refProblem;

            var entity = new Shipment { CompanyId = request.CompanyId };
            Apply(entity, request);

            db.Shipments.Add(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            await db.Entry(entity).Reference(x => x.Customer).LoadAsync(ct);
            return Results.Created($"/api/shipments/{entity.Id}", ShipmentResponse.From(entity));
        });

        group.MapPut("/{id:guid}", async (AppDbContext db, Guid id, ShipmentRequest request, CancellationToken ct) =>
        {
            var entity = await db.Shipments.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("Shipment", id);

            if (await ValidateReferences(db, request, ct) is { } refProblem) return refProblem;

            entity.CompanyId = request.CompanyId;
            Apply(entity, request);

            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            await db.Entry(entity).Reference(x => x.Customer).LoadAsync(ct);
            return Results.Ok(ShipmentResponse.From(entity));
        });

        // Assign a driver + truck to a shipment by creating the trip that carries it out.
        group.MapPost("/{id:guid}/assign", async (
            AppDbContext db, Guid id, AssignShipmentRequest request, CancellationToken ct) =>
        {
            var shipment = await db.Shipments.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (shipment is null) return EndpointHelpers.NotFoundProblem("Shipment", id);

            var driver = await db.Drivers.FirstOrDefaultAsync(x => x.Id == request.DriverId, ct);
            if (driver is null)
                return EndpointHelpers.ReferenceProblem($"Driver '{request.DriverId}' does not exist.");

            var truck = await db.Trucks.FirstOrDefaultAsync(x => x.Id == request.TruckId, ct);
            if (truck is null)
                return EndpointHelpers.ReferenceProblem($"Truck '{request.TruckId}' does not exist.");

            if (driver.CompanyId != shipment.CompanyId || truck.CompanyId != shipment.CompanyId)
                return EndpointHelpers.ReferenceProblem("Driver and truck must belong to the shipment's company.");

            var trip = new Trip
            {
                ShipmentId = shipment.Id,
                DriverId = driver.Id,
                TruckId = truck.Id,
                StartedAt = request.StartedAt,
                Status = TripStatus.Planned,
                Notes = request.Notes
            };

            db.Trips.Add(trip);

            if (shipment.Status == ShipmentStatus.Draft)
                shipment.Status = ShipmentStatus.Scheduled;

            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            await db.Entry(trip).Reference(x => x.Shipment).LoadAsync(ct);
            await db.Entry(trip).Reference(x => x.Driver).LoadAsync(ct);
            await db.Entry(trip).Reference(x => x.Truck).LoadAsync(ct);

            return Results.Created($"/api/trips/{trip.Id}", TripResponse.From(trip));
        });

        group.MapGet("/{id:guid}/trips", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            if (!await db.Shipments.AnyAsync(x => x.Id == id, ct))
                return EndpointHelpers.NotFoundProblem("Shipment", id);

            var trips = await db.Trips.AsNoTracking()
                .Include(x => x.Shipment).Include(x => x.Driver).Include(x => x.Truck)
                .Where(x => x.ShipmentId == id)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync(ct);

            return Results.Ok(trips.Select(TripResponse.From));
        });

        group.MapDelete("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await db.Shipments.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("Shipment", id);

            db.Shipments.Remove(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.NoContent();
        });

        return group;
    }

    private static async Task<IResult?> ValidateReferences(AppDbContext db, ShipmentRequest request, CancellationToken ct)
    {
        if (!await db.Companies.AnyAsync(x => x.Id == request.CompanyId, ct))
            return EndpointHelpers.ReferenceProblem($"Company '{request.CompanyId}' does not exist.");

        var customer = await db.Customers.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.CustomerId, ct);
        if (customer is null)
            return EndpointHelpers.ReferenceProblem($"Customer '{request.CustomerId}' does not exist.");
        if (customer.CompanyId != request.CompanyId)
            return EndpointHelpers.ReferenceProblem("Customer belongs to a different company.");

        if (request.DeliveryDate is { } delivery && delivery < request.PickupDate)
            return EndpointHelpers.ReferenceProblem("DeliveryDate must not be earlier than PickupDate.");

        return null;
    }

    private static void Apply(Shipment entity, ShipmentRequest request)
    {
        entity.CustomerId = request.CustomerId;
        entity.Reference = request.Reference;
        entity.OriginAddress = request.OriginAddress;
        entity.DestinationAddress = request.DestinationAddress;
        entity.CargoDescription = request.CargoDescription;
        entity.WeightKg = request.WeightKg;
        entity.Price = request.Price;
        entity.Currency = request.Currency.ToUpperInvariant();
        entity.PickupDate = request.PickupDate;
        entity.DeliveryDate = request.DeliveryDate;
        entity.Status = request.Status;
        entity.Notes = request.Notes;
    }
}
