using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Services;

public class CompanyService(AppDbContext db) : ICompanyService
{
    public async Task<PagedResult<CompanyResponse>> GetAllAsync(
        string? search, int? page, int? pageSize, CancellationToken ct)
    {
        var query = db.Companies.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(x => EF.Functions.ILike(x.Name, $"%{search}%"));

        return await query.OrderBy(x => x.Name)
            .ToPagedResultAsync(CompanyResponse.From, page, pageSize, ct);
    }

    public async Task<ServiceResult<CompanyResponse>> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Companies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return entity is null
            ? ServiceResult<CompanyResponse>.NotFound("Company", id)
            : ServiceResult<CompanyResponse>.Success(CompanyResponse.From(entity));
    }

    public async Task<ServiceResult<CompanyResponse>> CreateAsync(
        CompanyRequest request, CancellationToken ct)
    {
        var entity = new Company();
        Apply(entity, request);
        db.Companies.Add(entity);

        var saved = await db.TrySaveAsync(ct);
        return saved.IsSuccess
            ? ServiceResult<CompanyResponse>.Success(CompanyResponse.From(entity))
            : ServiceResult<CompanyResponse>.From(saved);
    }

    public async Task<ServiceResult<CompanyResponse>> UpdateAsync(
        Guid id, CompanyRequest request, CancellationToken ct)
    {
        var entity = await db.Companies.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult<CompanyResponse>.NotFound("Company", id);

        Apply(entity, request);

        var saved = await db.TrySaveAsync(ct);
        return saved.IsSuccess
            ? ServiceResult<CompanyResponse>.Success(CompanyResponse.From(entity))
            : ServiceResult<CompanyResponse>.From(saved);
    }

    public async Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Companies.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult.NotFound("Company", id);

        db.Companies.Remove(entity);
        return await db.TrySaveAsync(ct);
    }

    private static void Apply(Company entity, CompanyRequest request)
    {
        entity.Name = request.Name;
        entity.TaxId = request.TaxId;
        entity.Address = request.Address;
        entity.Phone = request.Phone;
        entity.Email = request.Email;
    }
}
