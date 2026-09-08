using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FleetManagement.Api.Data.Configurations;

public class DocumentConfiguration : IEntityTypeConfiguration<Document>
{
    public void Configure(EntityTypeBuilder<Document> builder)
    {
        builder.Property(x => x.OwnerType).HasConversion<string>().HasMaxLength(32);
        builder.Property(x => x.Type).HasConversion<string>().HasMaxLength(32);
        builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Number).HasMaxLength(64);
        builder.Property(x => x.FileUrl).HasMaxLength(1000);
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        builder.HasIndex(x => x.ExpiresOn);
        builder.HasIndex(x => new { x.OwnerType, x.Type });

        // Exactly one owner FK must be set, and it must match OwnerType.
        builder.ToTable(t => t.HasCheckConstraint(
            "CK_Documents_SingleOwner",
            """
            (("OwnerType" = 'Truck') AND "TruckId" IS NOT NULL AND "DriverId" IS NULL AND "ShipmentId" IS NULL)
            OR (("OwnerType" = 'Driver') AND "DriverId" IS NOT NULL AND "TruckId" IS NULL AND "ShipmentId" IS NULL)
            OR (("OwnerType" = 'Shipment') AND "ShipmentId" IS NOT NULL AND "TruckId" IS NULL AND "DriverId" IS NULL)
            """));

        builder.HasOne(x => x.Truck)
            .WithMany(x => x.Documents)
            .HasForeignKey(x => x.TruckId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Driver)
            .WithMany(x => x.Documents)
            .HasForeignKey(x => x.DriverId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Shipment)
            .WithMany(x => x.Documents)
            .HasForeignKey(x => x.ShipmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
