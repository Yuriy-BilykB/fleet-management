namespace FleetManagement.Api.Domain;

/// <summary>
/// A place a shipment starts or ends at. Shared reference data rather than
/// company-scoped: cities are the same for everyone.
/// </summary>
public class Location
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string CountryCode { get; set; } = null!;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Shipment> OriginShipments { get; set; } = [];
    public ICollection<Shipment> DestinationShipments { get; set; } = [];
}
