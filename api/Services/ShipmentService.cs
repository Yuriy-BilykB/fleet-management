using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Services;

public class ShipmentService(AppDbContext db) : IShipmentService
{
    public async Task<PagedResult<ShipmentResponse>> GetAllAsync(
        Guid? companyId, Guid? customerId, ShipmentStatus? status, string? search,
        DateTimeOffset? pickupFrom, DateTimeOffset? pickupTo, int? page, int? pageSize, CancellationToken ct)
    {
        var query = db.Shipments.AsNoTracking().Include(x => x.Customer)
            .Include(x => x.OriginLocation).Include(x => x.DestinationLocation).AsQueryable();

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

        return await query.OrderByDescending(x => x.PickupDate)
            .ToPagedResultAsync(ShipmentResponse.From, page, pageSize, ct);
    }

    public async Task<ServiceResult<ShipmentResponse>> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Shipments.AsNoTracking().Include(x => x.Customer)
            .Include(x => x.OriginLocation).Include(x => x.DestinationLocation)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return entity is null
            ? ServiceResult<ShipmentResponse>.NotFound("Shipment", id)
            : ServiceResult<ShipmentResponse>.Success(ShipmentResponse.From(entity));
    }

    public async Task<ServiceResult<ShipmentResponse>> CreateAsync(
        ShipmentRequest request, CancellationToken ct)
    {
        if (await ValidateReferencesAsync(request, ct) is { } problem)
            return ServiceResult<ShipmentResponse>.From(problem);

        var entity = new Shipment { CompanyId = request.CompanyId };
        Apply(entity, request);
        db.Shipments.Add(entity);

        var saved = await db.TrySaveAsync(ct);
        if (!saved.IsSuccess) return ServiceResult<ShipmentResponse>.From(saved);

        await db.Entry(entity).Reference(x => x.Customer).LoadAsync(ct);
        await db.Entry(entity).Reference(x => x.OriginLocation).LoadAsync(ct);
        await db.Entry(entity).Reference(x => x.DestinationLocation).LoadAsync(ct);
        return ServiceResult<ShipmentResponse>.Success(ShipmentResponse.From(entity));
    }

    public async Task<ServiceResult<ShipmentResponse>> UpdateAsync(
        Guid id, ShipmentRequest request, CancellationToken ct)
    {
        var entity = await db.Shipments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult<ShipmentResponse>.NotFound("Shipment", id);

        if (await ValidateReferencesAsync(request, ct) is { } problem)
            return ServiceResult<ShipmentResponse>.From(problem);

        entity.CompanyId = request.CompanyId;
        Apply(entity, request);

        var saved = await db.TrySaveAsync(ct);
        if (!saved.IsSuccess) return ServiceResult<ShipmentResponse>.From(saved);

        await db.Entry(entity).Reference(x => x.Customer).LoadAsync(ct);
        await db.Entry(entity).Reference(x => x.OriginLocation).LoadAsync(ct);
        await db.Entry(entity).Reference(x => x.DestinationLocation).LoadAsync(ct);
        return ServiceResult<ShipmentResponse>.Success(ShipmentResponse.From(entity));
    }

    /// <summary>
    /// Puts a driver and truck on a shipment by creating the trip that carries it
    /// out. A shipment still in Draft moves to Scheduled.
    /// </summary>
    public async Task<ServiceResult<TripResponse>> AssignAsync(
        Guid id, AssignShipmentRequest request, CancellationToken ct)
    {
        var shipment = await db.Shipments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (shipment is null) return ServiceResult<TripResponse>.NotFound("Shipment", id);

        var driver = await db.Drivers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.DriverId, ct);
        if (driver is null)
            return ServiceResult<TripResponse>.Invalid($"Driver '{request.DriverId}' does not exist.");

        var truck = await db.Trucks.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.TruckId, ct);
        if (truck is null)
            return ServiceResult<TripResponse>.Invalid($"Truck '{request.TruckId}' does not exist.");

        if (driver.CompanyId != shipment.CompanyId || truck.CompanyId != shipment.CompanyId)
            return ServiceResult<TripResponse>.Invalid(
                "Driver and truck must belong to the shipment's company.");

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

        var saved = await db.TrySaveAsync(ct);
        if (!saved.IsSuccess) return ServiceResult<TripResponse>.From(saved);

        var created = await db.Trips.AsNoTracking()
            .Include(x => x.Shipment).Include(x => x.Driver).Include(x => x.Truck)
            .FirstAsync(x => x.Id == trip.Id, ct);

        return ServiceResult<TripResponse>.Success(TripResponse.From(created));
    }

    public async Task<ServiceResult<IReadOnlyList<TripResponse>>> GetTripsAsync(
        Guid id, CancellationToken ct)
    {
        if (!await db.Shipments.AnyAsync(x => x.Id == id, ct))
            return ServiceResult<IReadOnlyList<TripResponse>>.NotFound("Shipment", id);

        var trips = await db.Trips.AsNoTracking()
            .Include(x => x.Shipment).Include(x => x.Driver).Include(x => x.Truck)
            .Where(x => x.ShipmentId == id)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);

        return ServiceResult<IReadOnlyList<TripResponse>>.Success(
            trips.Select(TripResponse.From).ToList());
    }

    public async Task<ServiceResult<IReadOnlyList<ShipmentStopResponse>>> GetStopsAsync(
        Guid id, CancellationToken ct)
    {
        if (!await db.Shipments.AnyAsync(x => x.Id == id, ct))
            return ServiceResult<IReadOnlyList<ShipmentStopResponse>>.NotFound("Shipment", id);

        var stops = await db.ShipmentStops.AsNoTracking()
            .Include(x => x.Location)
            .Where(x => x.ShipmentId == id)
            .OrderBy(x => x.Sequence)
            .ToListAsync(ct);

        return ServiceResult<IReadOnlyList<ShipmentStopResponse>>.Success(
            stops.Select(ShipmentStopResponse.From).ToList());
    }

    public async Task<ServiceResult<ShipmentStopResponse>> AddStopAsync(
        Guid id, ShipmentStopRequest request, CancellationToken ct)
    {
        if (!await db.Shipments.AnyAsync(x => x.Id == id, ct))
            return ServiceResult<ShipmentStopResponse>.NotFound("Shipment", id);

        if (!await db.Locations.AnyAsync(x => x.Id == request.LocationId, ct))
            return ServiceResult<ShipmentStopResponse>.Invalid($"Location '{request.LocationId}' does not exist.");

        // Appending is the common case, so a caller may leave Sequence at 0.
        var sequence = request.Sequence > 0
            ? request.Sequence
            : await db.ShipmentStops.Where(x => x.ShipmentId == id)
                .Select(x => (int?)x.Sequence).MaxAsync(ct) is { } max ? max + 1 : 1;

        var entity = new ShipmentStop
        {
            ShipmentId = id,
            LocationId = request.LocationId,
            Sequence = sequence,
            Notes = request.Notes
        };

        db.ShipmentStops.Add(entity);

        var saved = await db.TrySaveAsync(ct);
        if (!saved.IsSuccess) return ServiceResult<ShipmentStopResponse>.From(saved);

        await db.Entry(entity).Reference(x => x.Location).LoadAsync(ct);
        return ServiceResult<ShipmentStopResponse>.Success(ShipmentStopResponse.From(entity));
    }

    public async Task<ServiceResult> RemoveStopAsync(Guid id, Guid stopId, CancellationToken ct)
    {
        var entity = await db.ShipmentStops.FirstOrDefaultAsync(
            x => x.Id == stopId && x.ShipmentId == id, ct);
        if (entity is null) return ServiceResult.NotFound("ShipmentStop", stopId);

        db.ShipmentStops.Remove(entity);
        return await db.TrySaveAsync(ct);
    }

    public async Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Shipments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult.NotFound("Shipment", id);

        db.Shipments.Remove(entity);
        return await db.TrySaveAsync(ct);
    }

    private async Task<ServiceResult?> ValidateReferencesAsync(ShipmentRequest request, CancellationToken ct)
    {
        if (!await db.Companies.AnyAsync(x => x.Id == request.CompanyId, ct))
            return ServiceResult.Invalid($"Company '{request.CompanyId}' does not exist.");

        var customer = await db.Customers.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.CustomerId, ct);
        if (customer is null)
            return ServiceResult.Invalid($"Customer '{request.CustomerId}' does not exist.");
        if (customer.CompanyId != request.CompanyId)
            return ServiceResult.Invalid("Customer belongs to a different company.");

        if (request.DeliveryDate is { } delivery && delivery < request.PickupDate)
            return ServiceResult.Invalid("DeliveryDate must not be earlier than PickupDate.");

        return null;
    }

    private static void Apply(Shipment entity, ShipmentRequest request)
    {
        entity.CustomerId = request.CustomerId;
        entity.Reference = request.Reference;
        entity.OriginAddress = request.OriginAddress;
        entity.DestinationAddress = request.DestinationAddress;
        entity.OriginLocationId = request.OriginLocationId;
        entity.DestinationLocationId = request.DestinationLocationId;
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
