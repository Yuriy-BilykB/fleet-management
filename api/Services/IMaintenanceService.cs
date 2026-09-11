using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Domain;

namespace FleetManagement.Api.Services;

/// <summary>
/// Truck service records — maintenance, repairs and inspections. Named
/// "maintenance" rather than "truck service" so it does not read as
/// <c>TruckServiceService</c>.
/// </summary>
public interface IMaintenanceService
{
    Task<PagedResult<TruckServiceResponse>> GetAllAsync(
        Guid? truckId, Guid? companyId, TruckServiceType? type, DateOnly? from, DateOnly? to,
        int? page, int? pageSize, CancellationToken ct);
    Task<ServiceResult<TruckServiceResponse>> GetByIdAsync(Guid id, CancellationToken ct);
    Task<ServiceResult<TruckServiceResponse>> CreateAsync(TruckServiceRequest request, CancellationToken ct);
    Task<ServiceResult<TruckServiceResponse>> UpdateAsync(Guid id, TruckServiceRequest request, CancellationToken ct);
    Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct);
}
