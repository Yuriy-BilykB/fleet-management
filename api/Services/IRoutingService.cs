using FleetManagement.Api.Routing;

namespace FleetManagement.Api.Services;

public interface IRoutingService
{
    /// <summary>
    /// Road route for a shipment (origin → stops → destination), cached per distinct
    /// waypoint sequence. Falls back to the straight line when no provider is configured.
    /// </summary>
    Task<RouteResult?> GetShipmentRouteAsync(Guid shipmentId, CancellationToken ct);
}
