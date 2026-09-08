using System.ComponentModel.DataAnnotations;
using FleetManagement.Api.Domain;

namespace FleetManagement.Api.Contracts;

public record ShipmentRequest(
    Guid CompanyId,
    Guid CustomerId,
    [Required, MaxLength(32)] string Reference,
    [Required, MaxLength(400)] string OriginAddress,
    [Required, MaxLength(400)] string DestinationAddress,
    [Required, MaxLength(1000)] string CargoDescription,
    [Range(0, 100000)] decimal WeightKg,
    [Range(0, 10000000)] decimal? Price,
    [Required, MinLength(3), MaxLength(3)] string Currency,
    DateTimeOffset PickupDate,
    DateTimeOffset? DeliveryDate,
    ShipmentStatus Status,
    [MaxLength(1000)] string? Notes);

public record ShipmentResponse(
    Guid Id,
    Guid CompanyId,
    Guid CustomerId,
    string? CustomerName,
    string Reference,
    string OriginAddress,
    string DestinationAddress,
    string CargoDescription,
    decimal WeightKg,
    decimal? Price,
    string Currency,
    DateTimeOffset PickupDate,
    DateTimeOffset? DeliveryDate,
    ShipmentStatus Status,
    string? Notes,
    DateTimeOffset CreatedAt)
{
    public static ShipmentResponse From(Shipment s) =>
        new(s.Id, s.CompanyId, s.CustomerId, s.Customer?.Name, s.Reference, s.OriginAddress,
            s.DestinationAddress, s.CargoDescription, s.WeightKg, s.Price, s.Currency,
            s.PickupDate, s.DeliveryDate, s.Status, s.Notes, s.CreatedAt);
}

public record AssignShipmentRequest(
    Guid DriverId,
    Guid TruckId,
    DateTimeOffset? StartedAt,
    [MaxLength(1000)] string? Notes);
