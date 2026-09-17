using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FleetManagement.Api.Data.Configurations;

public class TruckPositionConfiguration : IEntityTypeConfiguration<TruckPosition>
{
    public void Configure(EntityTypeBuilder<TruckPosition> builder)
    {
        builder.Property(x => x.Source).HasMaxLength(64).IsRequired();
        builder.Property(x => x.RecordedAt).HasDefaultValueSql("now()");

        // Every read is "this truck, this time window, in order".
        builder.HasIndex(x => new { x.TruckId, x.RecordedAt });

        // A provider re-sending the same fix must not duplicate it.
        builder.HasIndex(x => new { x.TruckId, x.RecordedAt, x.Source }).IsUnique();

        builder.HasOne(x => x.Truck)
            .WithMany(x => x.Positions)
            .HasForeignKey(x => x.TruckId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
