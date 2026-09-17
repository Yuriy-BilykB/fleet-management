namespace FleetManagement.Api.Domain;

/// <summary>
/// An intermediate waypoint between a shipment's origin and destination.
/// Origin and destination stay on <see cref="Shipment"/>; these are the stops in between.
/// </summary>
public class ShipmentStop
{
    public Guid Id { get; set; }
    public Guid ShipmentId { get; set; }
    public Guid LocationId { get; set; }

    /// <summary>Order along the route, starting at 1.</summary>
    public int Sequence { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Shipment Shipment { get; set; } = null!;
    public Location Location { get; set; } = null!;
}
