using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FleetManagement.Api.Data.Configurations;

public class TripConfiguration : IEntityTypeConfiguration<Trip>
{
    public void Configure(EntityTypeBuilder<Trip> builder)
    {
        builder.Property(x => x.DistanceKm).HasPrecision(10, 2);
        builder.Property(x => x.FuelCost).HasPrecision(12, 2);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.ShipmentId);

        builder.HasOne(x => x.Shipment)
            .WithMany(x => x.Trips)
            .HasForeignKey(x => x.ShipmentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Driver)
            .WithMany(x => x.Trips)
            .HasForeignKey(x => x.DriverId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Truck)
            .WithMany(x => x.Trips)
            .HasForeignKey(x => x.TruckId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
