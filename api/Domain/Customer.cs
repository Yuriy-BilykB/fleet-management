namespace FleetManagement.Api.Domain;

public class Customer
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }

    public string Name { get; set; } = null!;
    public string? TaxId { get; set; }
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }

    public Company Company { get; set; } = null!;
    public ICollection<Shipment> Shipments { get; set; } = [];
}
