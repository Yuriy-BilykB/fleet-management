using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;

namespace FleetManagement.Api.Services;

public interface ITripTrackingService
{
    /// <summary>Planned route endpoints plus every fix recorded so far.</summary>
    Task<ServiceResult<TripTrackResponse>> GetTrackAsync(Guid tripId, CancellationToken ct);
}
