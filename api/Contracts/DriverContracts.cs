using System.ComponentModel.DataAnnotations;
using FleetManagement.Api.Domain;

namespace FleetManagement.Api.Contracts;

public record DriverRequest(
    Guid CompanyId,
    Guid? AssignedTruckId,
    [Required, MaxLength(100)] string FirstName,
    [Required, MaxLength(100)] string LastName,
    [MaxLength(32)] string? Phone,
    [EmailAddress, MaxLength(200)] string? Email,
    [Required, MaxLength(64)] string LicenseNumber,
    DateOnly? LicenseExpiry,
    DateOnly? HiredOn,
    DriverStatus Status,
    [MaxLength(1000)] string? Notes);

public record DriverResponse(
    Guid Id,
    Guid CompanyId,
    Guid? AssignedTruckId,
    string? AssignedTruckPlate,
    string FirstName,
    string LastName,
    string? Phone,
    string? Email,
    string LicenseNumber,
    DateOnly? LicenseExpiry,
    DateOnly? HiredOn,
    DriverStatus Status,
    string? Notes,
    DateTimeOffset CreatedAt)
{
    public static DriverResponse From(Driver d) =>
        new(d.Id, d.CompanyId, d.AssignedTruckId, d.AssignedTruck?.PlateNumber, d.FirstName, d.LastName,
            d.Phone, d.Email, d.LicenseNumber, d.LicenseExpiry, d.HiredOn, d.Status, d.Notes, d.CreatedAt);
}

public record AssignTruckRequest(Guid? TruckId);
