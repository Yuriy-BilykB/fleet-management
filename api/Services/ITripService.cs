using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Domain;

namespace FleetManagement.Api.Services;

public interface ITripService
{
    Task<PagedResult<TripResponse>> GetAllAsync(
        Guid? shipmentId, Guid? driverId, Guid? truckId, TripStatus? status,
        int? page, int? pageSize, CancellationToken ct);
    Task<ServiceResult<TripResponse>> GetByIdAsync(Guid id, CancellationToken ct);
    Task<ServiceResult<TripResponse>> CreateAsync(TripRequest request, CancellationToken ct);
    Task<ServiceResult<TripResponse>> UpdateAsync(Guid id, TripRequest request, CancellationToken ct);
    Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct);
}
