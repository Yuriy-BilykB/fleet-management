using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FleetManagement.Api.Data.Configurations;

public class TruckConfiguration : IEntityTypeConfiguration<Truck>
{
    public void Configure(EntityTypeBuilder<Truck> builder)
    {
        builder.Property(x => x.PlateNumber).HasMaxLength(16).IsRequired();
        builder.Property(x => x.Vin).HasMaxLength(32);
        builder.Property(x => x.ExternalId).HasMaxLength(128);
        builder.Property(x => x.Make).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Model).HasMaxLength(64).IsRequired();
        builder.Property(x => x.CapacityKg).HasPrecision(10, 2);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        builder.HasIndex(x => new { x.CompanyId, x.PlateNumber }).IsUnique();
        builder.HasIndex(x => x.Status);

        builder.HasOne(x => x.Company)
            .WithMany(x => x.Trucks)
            .HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
