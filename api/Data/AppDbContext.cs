using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Truck> Trucks => Set<Truck>();
    public DbSet<Driver> Drivers => Set<Driver>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<TruckService> TruckServices => Set<TruckService>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<TruckPosition> TruckPositions => Set<TruckPosition>();
    public DbSet<ShipmentStop> ShipmentStops => Set<ShipmentStop>();
    public DbSet<RoadRoute> Routes => Set<RoadRoute>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
