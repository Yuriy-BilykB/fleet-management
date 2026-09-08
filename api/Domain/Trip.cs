namespace FleetManagement.Api.Domain;

public class Trip
{
    public Guid Id { get; set; }
    public Guid ShipmentId { get; set; }
    public Guid DriverId { get; set; }
    public Guid TruckId { get; set; }

    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public decimal? DistanceKm { get; set; }
    public decimal? FuelCost { get; set; }
    public TripStatus Status { get; set; } = TripStatus.Planned;
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Shipment Shipment { get; set; } = null!;
    public Driver Driver { get; set; } = null!;
    public Truck Truck { get; set; } = null!;
}
