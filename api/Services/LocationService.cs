using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Services;

public class LocationService(AppDbContext db) : ILocationService
{
    public async Task<PagedResult<LocationResponse>> GetAllAsync(
        string? search, int? page, int? pageSize, CancellationToken ct)
    {
        var query = db.Locations.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(x => EF.Functions.ILike(x.Name, $"%{search}%"));

        return await query.OrderBy(x => x.CountryCode).ThenBy(x => x.Name)
            .ToPagedResultAsync(LocationResponse.From, page, pageSize, ct);
    }

    public async Task<ServiceResult<LocationResponse>> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Locations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return entity is null
            ? ServiceResult<LocationResponse>.NotFound("Location", id)
            : ServiceResult<LocationResponse>.Success(LocationResponse.From(entity));
    }

    public async Task<ServiceResult<LocationResponse>> CreateAsync(LocationRequest request, CancellationToken ct)
    {
        var entity = new Location();
        Apply(entity, request);
        db.Locations.Add(entity);

        var saved = await db.TrySaveAsync(ct);
        return saved.IsSuccess
            ? ServiceResult<LocationResponse>.Success(LocationResponse.From(entity))
            : ServiceResult<LocationResponse>.From(saved);
    }

    public async Task<ServiceResult<LocationResponse>> UpdateAsync(
        Guid id, LocationRequest request, CancellationToken ct)
    {
        var entity = await db.Locations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult<LocationResponse>.NotFound("Location", id);

        Apply(entity, request);

        var saved = await db.TrySaveAsync(ct);
        return saved.IsSuccess
            ? ServiceResult<LocationResponse>.Success(LocationResponse.From(entity))
            : ServiceResult<LocationResponse>.From(saved);
    }

    public async Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Locations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult.NotFound("Location", id);

        db.Locations.Remove(entity);
        return await db.TrySaveAsync(ct);
    }

    private static void Apply(Location entity, LocationRequest request)
    {
        entity.Name = request.Name;
        entity.CountryCode = request.CountryCode.ToUpperInvariant();
        entity.Latitude = request.Latitude;
        entity.Longitude = request.Longitude;
    }
}
