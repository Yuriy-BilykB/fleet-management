using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Services;

public class TruckService(AppDbContext db) : ITruckService
{
    public async Task<PagedResult<TruckResponse>> GetAllAsync(
        Guid? companyId, TruckStatus? status, string? search, int? page, int? pageSize, CancellationToken ct)
    {
        var query = db.Trucks.AsNoTracking().AsQueryable();

        if (companyId is not null) query = query.Where(x => x.CompanyId == companyId);
        if (status is not null) query = query.Where(x => x.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(x =>
                EF.Functions.ILike(x.PlateNumber, $"%{search}%") ||
                EF.Functions.ILike(x.Make, $"%{search}%") ||
                EF.Functions.ILike(x.Model, $"%{search}%"));

        return await query.OrderBy(x => x.PlateNumber)
            .ToPagedResultAsync(TruckResponse.From, page, pageSize, ct);
    }

    public async Task<ServiceResult<TruckResponse>> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Trucks.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return entity is null
            ? ServiceResult<TruckResponse>.NotFound("Truck", id)
            : ServiceResult<TruckResponse>.Success(TruckResponse.From(entity));
    }

    public async Task<ServiceResult<TruckResponse>> CreateAsync(TruckRequest request, CancellationToken ct)
    {
        if (!await db.Companies.AnyAsync(x => x.Id == request.CompanyId, ct))
            return ServiceResult<TruckResponse>.Invalid($"Company '{request.CompanyId}' does not exist.");

        var entity = new Truck { CompanyId = request.CompanyId };
        Apply(entity, request);
        db.Trucks.Add(entity);

        var saved = await db.TrySaveAsync(ct);
        return saved.IsSuccess
            ? ServiceResult<TruckResponse>.Success(TruckResponse.From(entity))
            : ServiceResult<TruckResponse>.From(saved);
    }

    public async Task<ServiceResult<TruckResponse>> UpdateAsync(
        Guid id, TruckRequest request, CancellationToken ct)
    {
        var entity = await db.Trucks.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult<TruckResponse>.NotFound("Truck", id);

        if (entity.CompanyId != request.CompanyId &&
            !await db.Companies.AnyAsync(x => x.Id == request.CompanyId, ct))
            return ServiceResult<TruckResponse>.Invalid($"Company '{request.CompanyId}' does not exist.");

        entity.CompanyId = request.CompanyId;
        Apply(entity, request);

        var saved = await db.TrySaveAsync(ct);
        return saved.IsSuccess
            ? ServiceResult<TruckResponse>.Success(TruckResponse.From(entity))
            : ServiceResult<TruckResponse>.From(saved);
    }

    public async Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Trucks.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult.NotFound("Truck", id);

        db.Trucks.Remove(entity);
        return await db.TrySaveAsync(ct);
    }

    private static void Apply(Truck entity, TruckRequest request)
    {
        entity.PlateNumber = request.PlateNumber;
        entity.Make = request.Make;
        entity.Model = request.Model;
        entity.Vin = request.Vin;
        entity.Year = request.Year;
        entity.CapacityKg = request.CapacityKg;
        entity.OdometerKm = request.OdometerKm;
        entity.Status = request.Status;
        entity.InsuranceExpiry = request.InsuranceExpiry;
        entity.InspectionExpiry = request.InspectionExpiry;
        entity.Notes = request.Notes;
    }
}
