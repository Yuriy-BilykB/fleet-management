using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Services;

public class DriverService(AppDbContext db) : IDriverService
{
    public async Task<PagedResult<DriverResponse>> GetAllAsync(
        Guid? companyId, Guid? truckId, DriverStatus? status, string? search,
        int? page, int? pageSize, CancellationToken ct)
    {
        var query = db.Drivers.AsNoTracking().Include(x => x.AssignedTruck).AsQueryable();

        if (companyId is not null) query = query.Where(x => x.CompanyId == companyId);
        if (truckId is not null) query = query.Where(x => x.AssignedTruckId == truckId);
        if (status is not null) query = query.Where(x => x.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(x =>
                EF.Functions.ILike(x.FirstName, $"%{search}%") ||
                EF.Functions.ILike(x.LastName, $"%{search}%") ||
                EF.Functions.ILike(x.LicenseNumber, $"%{search}%"));

        return await query.OrderBy(x => x.LastName).ThenBy(x => x.FirstName)
            .ToPagedResultAsync(DriverResponse.From, page, pageSize, ct);
    }

    public async Task<ServiceResult<DriverResponse>> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Drivers.AsNoTracking().Include(x => x.AssignedTruck)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return entity is null
            ? ServiceResult<DriverResponse>.NotFound("Driver", id)
            : ServiceResult<DriverResponse>.Success(DriverResponse.From(entity));
    }

    public async Task<ServiceResult<DriverResponse>> CreateAsync(DriverRequest request, CancellationToken ct)
    {
        if (await ValidateReferencesAsync(request, ct) is { } problem)
            return ServiceResult<DriverResponse>.From(problem);

        var entity = new Driver { CompanyId = request.CompanyId };
        Apply(entity, request);
        db.Drivers.Add(entity);

        var saved = await db.TrySaveAsync(ct);
        if (!saved.IsSuccess) return ServiceResult<DriverResponse>.From(saved);

        await db.Entry(entity).Reference(x => x.AssignedTruck).LoadAsync(ct);
        return ServiceResult<DriverResponse>.Success(DriverResponse.From(entity));
    }

    public async Task<ServiceResult<DriverResponse>> UpdateAsync(
        Guid id, DriverRequest request, CancellationToken ct)
    {
        var entity = await db.Drivers.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult<DriverResponse>.NotFound("Driver", id);

        if (await ValidateReferencesAsync(request, ct) is { } problem)
            return ServiceResult<DriverResponse>.From(problem);

        entity.CompanyId = request.CompanyId;
        Apply(entity, request);

        var saved = await db.TrySaveAsync(ct);
        if (!saved.IsSuccess) return ServiceResult<DriverResponse>.From(saved);

        await db.Entry(entity).Reference(x => x.AssignedTruck).LoadAsync(ct);
        return ServiceResult<DriverResponse>.Success(DriverResponse.From(entity));
    }

    /// <summary>Assigns or clears the truck a driver normally drives.</summary>
    public async Task<ServiceResult<DriverResponse>> AssignTruckAsync(
        Guid id, AssignTruckRequest request, CancellationToken ct)
    {
        var entity = await db.Drivers.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult<DriverResponse>.NotFound("Driver", id);

        if (request.TruckId is { } truckId)
        {
            var truck = await db.Trucks.AsNoTracking().FirstOrDefaultAsync(x => x.Id == truckId, ct);
            if (truck is null)
                return ServiceResult<DriverResponse>.Invalid($"Truck '{truckId}' does not exist.");
            if (truck.CompanyId != entity.CompanyId)
                return ServiceResult<DriverResponse>.Invalid("Truck belongs to a different company.");
        }

        entity.AssignedTruckId = request.TruckId;

        var saved = await db.TrySaveAsync(ct);
        if (!saved.IsSuccess) return ServiceResult<DriverResponse>.From(saved);

        await db.Entry(entity).Reference(x => x.AssignedTruck).LoadAsync(ct);
        return ServiceResult<DriverResponse>.Success(DriverResponse.From(entity));
    }

    public async Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Drivers.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult.NotFound("Driver", id);

        db.Drivers.Remove(entity);
        return await db.TrySaveAsync(ct);
    }

    private async Task<ServiceResult?> ValidateReferencesAsync(DriverRequest request, CancellationToken ct)
    {
        if (!await db.Companies.AnyAsync(x => x.Id == request.CompanyId, ct))
            return ServiceResult.Invalid($"Company '{request.CompanyId}' does not exist.");

        if (request.AssignedTruckId is { } truckId)
        {
            var truck = await db.Trucks.AsNoTracking().FirstOrDefaultAsync(x => x.Id == truckId, ct);
            if (truck is null) return ServiceResult.Invalid($"Truck '{truckId}' does not exist.");
            if (truck.CompanyId != request.CompanyId)
                return ServiceResult.Invalid("Truck belongs to a different company.");
        }

        return null;
    }

    private static void Apply(Driver entity, DriverRequest request)
    {
        entity.AssignedTruckId = request.AssignedTruckId;
        entity.FirstName = request.FirstName;
        entity.LastName = request.LastName;
        entity.Phone = request.Phone;
        entity.Email = request.Email;
        entity.LicenseNumber = request.LicenseNumber;
        entity.LicenseExpiry = request.LicenseExpiry;
        entity.HiredOn = request.HiredOn;
        entity.Status = request.Status;
        entity.Notes = request.Notes;
    }
}
