namespace FleetManagement.Api.Domain;

public class Company
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? TaxId { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Truck> Trucks { get; set; } = [];
    public ICollection<Driver> Drivers { get; set; } = [];
    public ICollection<Customer> Customers { get; set; } = [];
    public ICollection<Shipment> Shipments { get; set; } = [];
}
