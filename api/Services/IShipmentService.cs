using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Domain;

namespace FleetManagement.Api.Services;

public interface IShipmentService
{
    Task<PagedResult<ShipmentResponse>> GetAllAsync(
        Guid? companyId, Guid? customerId, ShipmentStatus? status, string? search,
        DateTimeOffset? pickupFrom, DateTimeOffset? pickupTo, int? page, int? pageSize, CancellationToken ct);
    Task<ServiceResult<ShipmentResponse>> GetByIdAsync(Guid id, CancellationToken ct);
    Task<ServiceResult<ShipmentResponse>> CreateAsync(ShipmentRequest request, CancellationToken ct);
    Task<ServiceResult<ShipmentResponse>> UpdateAsync(Guid id, ShipmentRequest request, CancellationToken ct);
    Task<ServiceResult<TripResponse>> AssignAsync(Guid id, AssignShipmentRequest request, CancellationToken ct);
    Task<ServiceResult<IReadOnlyList<TripResponse>>> GetTripsAsync(Guid id, CancellationToken ct);
    Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct);
}
