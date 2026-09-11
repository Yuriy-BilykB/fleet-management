using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;

namespace FleetManagement.Api.Services;

public interface ICustomerService
{
    Task<PagedResult<CustomerResponse>> GetAllAsync(
        Guid? companyId, bool? isActive, string? search, int? page, int? pageSize, CancellationToken ct);
    Task<ServiceResult<CustomerResponse>> GetByIdAsync(Guid id, CancellationToken ct);
    Task<ServiceResult<CustomerResponse>> CreateAsync(CustomerRequest request, CancellationToken ct);
    Task<ServiceResult<CustomerResponse>> UpdateAsync(Guid id, CustomerRequest request, CancellationToken ct);
    Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct);
}
