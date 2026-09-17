using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;

namespace FleetManagement.Api.Services;

public interface ILocationService
{
    Task<PagedResult<LocationResponse>> GetAllAsync(
        string? search, int? page, int? pageSize, CancellationToken ct);
    Task<ServiceResult<LocationResponse>> GetByIdAsync(Guid id, CancellationToken ct);
    Task<ServiceResult<LocationResponse>> CreateAsync(LocationRequest request, CancellationToken ct);
    Task<ServiceResult<LocationResponse>> UpdateAsync(Guid id, LocationRequest request, CancellationToken ct);
    Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct);
}
