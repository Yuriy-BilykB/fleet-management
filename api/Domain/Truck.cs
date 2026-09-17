namespace FleetManagement.Api.Domain;

public class Truck
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }

    public string PlateNumber { get; set; } = null!;
    public string? Vin { get; set; }
    /// <summary>Vehicle id in the telematics provider, once one is connected.</summary>
    public string? ExternalId { get; set; }
    public string Make { get; set; } = null!;
    public string Model { get; set; } = null!;
    public int? Year { get; set; }
    public decimal CapacityKg { get; set; }
    public int OdometerKm { get; set; }
    public TruckStatus Status { get; set; } = TruckStatus.Available;
    public DateOnly? InsuranceExpiry { get; set; }
    public DateOnly? InspectionExpiry { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Company Company { get; set; } = null!;
    public ICollection<Driver> AssignedDrivers { get; set; } = [];
    public ICollection<Trip> Trips { get; set; } = [];
    public ICollection<TruckService> Services { get; set; } = [];
    public ICollection<Document> Documents { get; set; } = [];
    public ICollection<TruckPosition> Positions { get; set; } = [];
}
