using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

// The entity is Domain.TruckService, which collides with this namespace's
// TruckService (the trucks CRUD service). Alias it to keep both readable.
using ServiceRecord = FleetManagement.Api.Domain.TruckService;

namespace FleetManagement.Api.Services;

public class MaintenanceService(AppDbContext db) : IMaintenanceService
{
    public async Task<PagedResult<TruckServiceResponse>> GetAllAsync(
        Guid? truckId, Guid? companyId, TruckServiceType? type, DateOnly? from, DateOnly? to,
        int? page, int? pageSize, CancellationToken ct)
    {
        var query = db.TruckServices.AsNoTracking().Include(x => x.Truck).AsQueryable();

        if (truckId is not null) query = query.Where(x => x.TruckId == truckId);
        if (companyId is not null) query = query.Where(x => x.Truck.CompanyId == companyId);
        if (type is not null) query = query.Where(x => x.Type == type);
        if (from is not null) query = query.Where(x => x.ServiceDate >= from);
        if (to is not null) query = query.Where(x => x.ServiceDate <= to);

        return await query.OrderByDescending(x => x.ServiceDate)
            .ToPagedResultAsync(TruckServiceResponse.From, page, pageSize, ct);
    }

    public async Task<ServiceResult<TruckServiceResponse>> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.TruckServices.AsNoTracking().Include(x => x.Truck)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return entity is null
            ? ServiceResult<TruckServiceResponse>.NotFound("TruckService", id)
            : ServiceResult<TruckServiceResponse>.Success(TruckServiceResponse.From(entity));
    }

    public async Task<ServiceResult<TruckServiceResponse>> CreateAsync(
        TruckServiceRequest request, CancellationToken ct)
    {
        if (!await db.Trucks.AnyAsync(x => x.Id == request.TruckId, ct))
            return ServiceResult<TruckServiceResponse>.Invalid($"Truck '{request.TruckId}' does not exist.");

        var entity = new ServiceRecord();
        Apply(entity, request);
        db.TruckServices.Add(entity);

        var saved = await db.TrySaveAsync(ct);
        if (!saved.IsSuccess) return ServiceResult<TruckServiceResponse>.From(saved);

        await db.Entry(entity).Reference(x => x.Truck).LoadAsync(ct);
        return ServiceResult<TruckServiceResponse>.Success(TruckServiceResponse.From(entity));
    }

    public async Task<ServiceResult<TruckServiceResponse>> UpdateAsync(
        Guid id, TruckServiceRequest request, CancellationToken ct)
    {
        var entity = await db.TruckServices.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult<TruckServiceResponse>.NotFound("TruckService", id);

        if (entity.TruckId != request.TruckId &&
            !await db.Trucks.AnyAsync(x => x.Id == request.TruckId, ct))
            return ServiceResult<TruckServiceResponse>.Invalid($"Truck '{request.TruckId}' does not exist.");

        Apply(entity, request);

        var saved = await db.TrySaveAsync(ct);
        if (!saved.IsSuccess) return ServiceResult<TruckServiceResponse>.From(saved);

        await db.Entry(entity).Reference(x => x.Truck).LoadAsync(ct);
        return ServiceResult<TruckServiceResponse>.Success(TruckServiceResponse.From(entity));
    }

    public async Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.TruckServices.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult.NotFound("TruckService", id);

        db.TruckServices.Remove(entity);
        return await db.TrySaveAsync(ct);
    }

    private static void Apply(ServiceRecord entity, TruckServiceRequest request)
    {
        entity.TruckId = request.TruckId;
        entity.Type = request.Type;
        entity.Description = request.Description;
        entity.ServiceDate = request.ServiceDate;
        entity.Cost = request.Cost;
        entity.Currency = request.Currency.ToUpperInvariant();
        entity.OdometerKm = request.OdometerKm;
        entity.Provider = request.Provider;
        entity.NextServiceDate = request.NextServiceDate;
        entity.Notes = request.Notes;
    }
}
