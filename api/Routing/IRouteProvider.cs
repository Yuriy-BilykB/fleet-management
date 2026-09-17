namespace FleetManagement.Api.Routing;

public interface IRouteProvider
{
    bool IsConfigured { get; }

    /// <summary>Road route through the waypoints in order, or null when it cannot be produced.</summary>
    Task<RouteResult?> GetRouteAsync(IReadOnlyList<GeoPoint> waypoints, CancellationToken ct);
}
