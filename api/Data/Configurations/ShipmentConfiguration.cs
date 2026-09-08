using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FleetManagement.Api.Data.Configurations;

public class ShipmentConfiguration : IEntityTypeConfiguration<Shipment>
{
    public void Configure(EntityTypeBuilder<Shipment> builder)
    {
        builder.Property(x => x.Reference).HasMaxLength(32).IsRequired();
        builder.Property(x => x.OriginAddress).HasMaxLength(400).IsRequired();
        builder.Property(x => x.DestinationAddress).HasMaxLength(400).IsRequired();
        builder.Property(x => x.CargoDescription).HasMaxLength(1000).IsRequired();
        builder.Property(x => x.WeightKg).HasPrecision(10, 2);
        builder.Property(x => x.Price).HasPrecision(12, 2);
        builder.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        builder.HasIndex(x => new { x.CompanyId, x.Reference }).IsUnique();
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.PickupDate);

        builder.HasOne(x => x.Company)
            .WithMany(x => x.Shipments)
            .HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Customer)
            .WithMany(x => x.Shipments)
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
