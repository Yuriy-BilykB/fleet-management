using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FleetManagement.Api.Data.Configurations;

public class RoadRoadRouteConfiguration : IEntityTypeConfiguration<RoadRoute>
{
    public void Configure(EntityTypeBuilder<RoadRoute> builder)
    {
        builder.Property(x => x.RouteKey).HasMaxLength(1000).IsRequired();
        builder.Property(x => x.Provider).HasMaxLength(64).IsRequired();
        builder.Property(x => x.DistanceKm).HasPrecision(10, 2);
        builder.Property(x => x.Geometry).HasColumnType("jsonb").IsRequired();
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("now()");

        builder.HasIndex(x => x.RouteKey).IsUnique();
    }
}
