namespace FleetManagement.Api.Domain;

public class TruckService
{
    public Guid Id { get; set; }
    public Guid TruckId { get; set; }

    public TruckServiceType Type { get; set; } = TruckServiceType.Maintenance;
    public string Description { get; set; } = null!;
    public DateOnly ServiceDate { get; set; }
    public decimal Cost { get; set; }
    public string Currency { get; set; } = "EUR";
    public int? OdometerKm { get; set; }
    public string? Provider { get; set; }
    public DateOnly? NextServiceDate { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Truck Truck { get; set; } = null!;
}
