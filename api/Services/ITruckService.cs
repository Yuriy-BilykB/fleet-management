using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Domain;

namespace FleetManagement.Api.Services;

public interface ITruckService
{
    Task<PagedResult<TruckResponse>> GetAllAsync(
        Guid? companyId, TruckStatus? status, string? search, int? page, int? pageSize, CancellationToken ct);
    Task<ServiceResult<TruckResponse>> GetByIdAsync(Guid id, CancellationToken ct);
    Task<ServiceResult<TruckResponse>> CreateAsync(TruckRequest request, CancellationToken ct);
    Task<ServiceResult<TruckResponse>> UpdateAsync(Guid id, TruckRequest request, CancellationToken ct);
    Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct);
}
