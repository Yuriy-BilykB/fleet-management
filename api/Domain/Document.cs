namespace FleetManagement.Api.Domain;

public class Document
{
    public Guid Id { get; set; }

    public DocumentOwnerType OwnerType { get; set; }
    public Guid? TruckId { get; set; }
    public Guid? DriverId { get; set; }
    public Guid? ShipmentId { get; set; }

    public DocumentType Type { get; set; } = DocumentType.Other;
    public string Title { get; set; } = null!;
    public string? Number { get; set; }
    public string? FileUrl { get; set; }
    public DateOnly? IssuedOn { get; set; }
    public DateOnly? ExpiresOn { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Truck? Truck { get; set; }
    public Driver? Driver { get; set; }
    public Shipment? Shipment { get; set; }
}
