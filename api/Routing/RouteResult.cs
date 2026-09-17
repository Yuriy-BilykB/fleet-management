namespace FleetManagement.Api.Routing;

/// <summary>A road route: the polyline plus what the provider says it costs to drive.</summary>
public record RouteResult(
    IReadOnlyList<GeoPoint> Points,
    decimal DistanceKm,
    int DurationMinutes,
    string Provider);

/// <summary>Stored and sent as [longitude, latitude], the order GeoJSON and ORS use.</summary>
public record GeoPoint(double Longitude, double Latitude);
