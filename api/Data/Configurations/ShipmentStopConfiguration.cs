using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FleetManagement.Api.Data.Configurations;

public class ShipmentStopConfiguration : IEntityTypeConfiguration<ShipmentStop>
{
    public void Configure(EntityTypeBuilder<ShipmentStop> builder)
    {
        builder.Property(x => x.Notes).HasMaxLength(400);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        // Stops are always read in route order.
        builder.HasIndex(x => new { x.ShipmentId, x.Sequence }).IsUnique();

        builder.HasOne(x => x.Shipment)
            .WithMany(x => x.Stops)
            .HasForeignKey(x => x.ShipmentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Location)
            .WithMany()
            .HasForeignKey(x => x.LocationId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
