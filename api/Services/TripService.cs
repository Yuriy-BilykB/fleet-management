using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Services;

public class TripService(AppDbContext db) : ITripService
{
    public async Task<PagedResult<TripResponse>> GetAllAsync(
        Guid? shipmentId, Guid? driverId, Guid? truckId, TripStatus? status,
        int? page, int? pageSize, CancellationToken ct)
    {
        var query = Detailed(db.Trips.AsNoTracking());

        if (shipmentId is not null) query = query.Where(x => x.ShipmentId == shipmentId);
        if (driverId is not null) query = query.Where(x => x.DriverId == driverId);
        if (truckId is not null) query = query.Where(x => x.TruckId == truckId);
        if (status is not null) query = query.Where(x => x.Status == status);

        return await query.OrderByDescending(x => x.CreatedAt)
            .ToPagedResultAsync(TripResponse.From, page, pageSize, ct);
    }

    public async Task<ServiceResult<TripResponse>> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var entity = await Detailed(db.Trips.AsNoTracking()).FirstOrDefaultAsync(x => x.Id == id, ct);
        return entity is null
            ? ServiceResult<TripResponse>.NotFound("Trip", id)
            : ServiceResult<TripResponse>.Success(TripResponse.From(entity));
    }

    public async Task<ServiceResult<TripResponse>> CreateAsync(TripRequest request, CancellationToken ct)
    {
        if (await ValidateReferencesAsync(request, ct) is { } problem)
            return ServiceResult<TripResponse>.From(problem);

        var entity = new Trip();
        Apply(entity, request);
        db.Trips.Add(entity);

        var saved = await db.TrySaveAsync(ct);
        return saved.IsSuccess
            ? ServiceResult<TripResponse>.Success(TripResponse.From(await ReloadAsync(entity.Id, ct)))
            : ServiceResult<TripResponse>.From(saved);
    }

    public async Task<ServiceResult<TripResponse>> UpdateAsync(
        Guid id, TripRequest request, CancellationToken ct)
    {
        var entity = await db.Trips.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult<TripResponse>.NotFound("Trip", id);

        if (await ValidateReferencesAsync(request, ct) is { } problem)
            return ServiceResult<TripResponse>.From(problem);

        Apply(entity, request);

        var saved = await db.TrySaveAsync(ct);
        return saved.IsSuccess
            ? ServiceResult<TripResponse>.Success(TripResponse.From(await ReloadAsync(entity.Id, ct)))
            : ServiceResult<TripResponse>.From(saved);
    }

    public async Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Trips.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult.NotFound("Trip", id);

        db.Trips.Remove(entity);
        return await db.TrySaveAsync(ct);
    }

    private static IQueryable<Trip> Detailed(IQueryable<Trip> query) =>
        query.Include(x => x.Shipment).Include(x => x.Driver).Include(x => x.Truck);

    private async Task<Trip> ReloadAsync(Guid id, CancellationToken ct) =>
        await Detailed(db.Trips.AsNoTracking()).FirstAsync(x => x.Id == id, ct);

    private async Task<ServiceResult?> ValidateReferencesAsync(TripRequest request, CancellationToken ct)
    {
        var shipment = await db.Shipments.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.ShipmentId, ct);
        if (shipment is null)
            return ServiceResult.Invalid($"Shipment '{request.ShipmentId}' does not exist.");

        var driver = await db.Drivers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.DriverId, ct);
        if (driver is null) return ServiceResult.Invalid($"Driver '{request.DriverId}' does not exist.");

        var truck = await db.Trucks.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.TruckId, ct);
        if (truck is null) return ServiceResult.Invalid($"Truck '{request.TruckId}' does not exist.");

        if (driver.CompanyId != shipment.CompanyId || truck.CompanyId != shipment.CompanyId)
            return ServiceResult.Invalid("Driver and truck must belong to the shipment's company.");

        if (request.CompletedAt is { } completed && request.StartedAt is { } started && completed < started)
            return ServiceResult.Invalid("CompletedAt must not be earlier than StartedAt.");

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
