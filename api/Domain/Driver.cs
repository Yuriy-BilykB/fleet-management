namespace FleetManagement.Api.Domain;

public class Driver
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid? AssignedTruckId { get; set; }

    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string LicenseNumber { get; set; } = null!;
    public DateOnly? LicenseExpiry { get; set; }
    public DateOnly? HiredOn { get; set; }
    public DriverStatus Status { get; set; } = DriverStatus.Active;
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Company Company { get; set; } = null!;
    public Truck? AssignedTruck { get; set; }
    public ICollection<Trip> Trips { get; set; } = [];
    public ICollection<Document> Documents { get; set; } = [];
}
