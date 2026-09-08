namespace FleetManagement.Api.Domain;

public class Shipment
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid CustomerId { get; set; }

    public string Reference { get; set; } = null!;
    public string OriginAddress { get; set; } = null!;
    public string DestinationAddress { get; set; } = null!;
    public string CargoDescription { get; set; } = null!;
    public decimal WeightKg { get; set; }
    public decimal? Price { get; set; }
    public string Currency { get; set; } = "UAH";
    public DateTimeOffset PickupDate { get; set; }
    public DateTimeOffset? DeliveryDate { get; set; }
    public ShipmentStatus Status { get; set; } = ShipmentStatus.Draft;
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Company Company { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    public ICollection<Trip> Trips { get; set; } = [];
    public ICollection<Document> Documents { get; set; } = [];
}
