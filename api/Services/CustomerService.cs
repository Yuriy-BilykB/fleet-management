using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Services;

public class CustomerService(AppDbContext db) : ICustomerService
{
    public async Task<PagedResult<CustomerResponse>> GetAllAsync(
        Guid? companyId, bool? isActive, string? search, int? page, int? pageSize, CancellationToken ct)
    {
        var query = db.Customers.AsNoTracking().AsQueryable();

        if (companyId is not null) query = query.Where(x => x.CompanyId == companyId);
        if (isActive is not null) query = query.Where(x => x.IsActive == isActive);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(x =>
                EF.Functions.ILike(x.Name, $"%{search}%") ||
                (x.ContactPerson != null && EF.Functions.ILike(x.ContactPerson, $"%{search}%")));

        return await query.OrderBy(x => x.Name)
            .ToPagedResultAsync(CustomerResponse.From, page, pageSize, ct);
    }

    public async Task<ServiceResult<CustomerResponse>> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Customers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return entity is null
            ? ServiceResult<CustomerResponse>.NotFound("Customer", id)
            : ServiceResult<CustomerResponse>.Success(CustomerResponse.From(entity));
    }

    public async Task<ServiceResult<CustomerResponse>> CreateAsync(
        CustomerRequest request, CancellationToken ct)
    {
        if (!await db.Companies.AnyAsync(x => x.Id == request.CompanyId, ct))
            return ServiceResult<CustomerResponse>.Invalid($"Company '{request.CompanyId}' does not exist.");

        var entity = new Customer { CompanyId = request.CompanyId };
        Apply(entity, request);
        db.Customers.Add(entity);

        var saved = await db.TrySaveAsync(ct);
        return saved.IsSuccess
            ? ServiceResult<CustomerResponse>.Success(CustomerResponse.From(entity))
            : ServiceResult<CustomerResponse>.From(saved);
    }

    public async Task<ServiceResult<CustomerResponse>> UpdateAsync(
        Guid id, CustomerRequest request, CancellationToken ct)
    {
        var entity = await db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult<CustomerResponse>.NotFound("Customer", id);

        if (entity.CompanyId != request.CompanyId &&
            !await db.Companies.AnyAsync(x => x.Id == request.CompanyId, ct))
            return ServiceResult<CustomerResponse>.Invalid($"Company '{request.CompanyId}' does not exist.");

        entity.CompanyId = request.CompanyId;
        Apply(entity, request);

        var saved = await db.TrySaveAsync(ct);
        return saved.IsSuccess
            ? ServiceResult<CustomerResponse>.Success(CustomerResponse.From(entity))
            : ServiceResult<CustomerResponse>.From(saved);
    }

    public async Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult.NotFound("Customer", id);

        db.Customers.Remove(entity);
        return await db.TrySaveAsync(ct);
    }

    private static void Apply(Customer entity, CustomerRequest request)
    {
        entity.Name = request.Name;
        entity.TaxId = request.TaxId;
        entity.ContactPerson = request.ContactPerson;
        entity.Phone = request.Phone;
        entity.Email = request.Email;
        entity.Address = request.Address;
        entity.Notes = request.Notes;
        entity.IsActive = request.IsActive;
    }
}
