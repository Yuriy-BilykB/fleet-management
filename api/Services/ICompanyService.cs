using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;

namespace FleetManagement.Api.Services;

public interface ICompanyService
{
    Task<PagedResult<CompanyResponse>> GetAllAsync(
        string? search, int? page, int? pageSize, CancellationToken ct);
    Task<ServiceResult<CompanyResponse>> GetByIdAsync(Guid id, CancellationToken ct);
    Task<ServiceResult<CompanyResponse>> CreateAsync(CompanyRequest request, CancellationToken ct);
    Task<ServiceResult<CompanyResponse>> UpdateAsync(Guid id, CompanyRequest request, CancellationToken ct);
    Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct);
}
