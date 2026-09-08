using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FleetManagement.Api.Data.Configurations;

public class TruckServiceConfiguration : IEntityTypeConfiguration<TruckService>
{
    public void Configure(EntityTypeBuilder<TruckService> builder)
    {
        builder.Property(x => x.Type).HasConversion<string>().HasMaxLength(32);
        builder.Property(x => x.Description).HasMaxLength(1000).IsRequired();
        builder.Property(x => x.Cost).HasPrecision(12, 2);
        builder.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        builder.Property(x => x.Provider).HasMaxLength(200);
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        builder.HasIndex(x => new { x.TruckId, x.ServiceDate });

        builder.HasOne(x => x.Truck)
            .WithMany(x => x.Services)
            .HasForeignKey(x => x.TruckId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
