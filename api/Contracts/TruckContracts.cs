using System.ComponentModel.DataAnnotations;
using FleetManagement.Api.Domain;

namespace FleetManagement.Api.Contracts;

public record TruckRequest(
    Guid CompanyId,
    [Required, MaxLength(16)] string PlateNumber,
    [Required, MaxLength(64)] string Make,
    [Required, MaxLength(64)] string Model,
    [MaxLength(32)] string? Vin,
    [Range(1900, 2100)] int? Year,
    [Range(0, 100000)] decimal CapacityKg,
    [Range(0, int.MaxValue)] int OdometerKm,
    TruckStatus Status,
    DateOnly? InsuranceExpiry,
    DateOnly? InspectionExpiry,
    [MaxLength(1000)] string? Notes);

public record TruckResponse(
    Guid Id,
    Guid CompanyId,
    string PlateNumber,
    string Make,
    string Model,
    string? Vin,
    int? Year,
    decimal CapacityKg,
    int OdometerKm,
    TruckStatus Status,
    DateOnly? InsuranceExpiry,
    DateOnly? InspectionExpiry,
    string? Notes,
    DateTimeOffset CreatedAt)
{
    public static TruckResponse From(Truck t) =>
        new(t.Id, t.CompanyId, t.PlateNumber, t.Make, t.Model, t.Vin, t.Year, t.CapacityKg,
            t.OdometerKm, t.Status, t.InsuranceExpiry, t.InspectionExpiry, t.Notes, t.CreatedAt);
}
