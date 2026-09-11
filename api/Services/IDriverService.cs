using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Domain;

namespace FleetManagement.Api.Services;

public interface IDriverService
{
    Task<PagedResult<DriverResponse>> GetAllAsync(
        Guid? companyId, Guid? truckId, DriverStatus? status, string? search,
        int? page, int? pageSize, CancellationToken ct);
    Task<ServiceResult<DriverResponse>> GetByIdAsync(Guid id, CancellationToken ct);
    Task<ServiceResult<DriverResponse>> CreateAsync(DriverRequest request, CancellationToken ct);
    Task<ServiceResult<DriverResponse>> UpdateAsync(Guid id, DriverRequest request, CancellationToken ct);
    Task<ServiceResult<DriverResponse>> AssignTruckAsync(Guid id, AssignTruckRequest request, CancellationToken ct);
    Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct);
}
