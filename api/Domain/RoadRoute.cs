namespace FleetManagement.Api.Domain;

/// <summary>
/// A road route between an ordered list of locations, cached so the routing
/// provider is called once per distinct sequence rather than once per trip.
/// </summary>
public class RoadRoute
{
    public Guid Id { get; set; }

    /// <summary>Ordered location ids joined by "-": the cache key for this route.</summary>
    public string RouteKey { get; set; } = null!;
    public string Provider { get; set; } = null!;
    public decimal DistanceKm { get; set; }
    public int DurationMinutes { get; set; }

    /// <summary>The road geometry as a JSON array of [longitude, latitude] pairs.</summary>
    public string Geometry { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; }
}
