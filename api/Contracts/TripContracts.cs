using System.ComponentModel.DataAnnotations;
using FleetManagement.Api.Domain;

namespace FleetManagement.Api.Contracts;

public record TripRequest(
    Guid ShipmentId,
    Guid DriverId,
    Guid TruckId,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    [Range(0, 100000)] decimal? DistanceKm,
    [Range(0, 10000000)] decimal? FuelCost,
    TripStatus Status,
    [MaxLength(1000)] string? Notes);

public record TripResponse(
    Guid Id,
    Guid ShipmentId,
    string? ShipmentReference,
    Guid DriverId,
    string? DriverName,
    Guid TruckId,
    string? TruckPlate,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    decimal? DistanceKm,
    decimal? FuelCost,
    TripStatus Status,
    string? Notes,
    DateTimeOffset CreatedAt)
{
    public static TripResponse From(Trip t) =>
        new(t.Id, t.ShipmentId, t.Shipment?.Reference, t.DriverId,
            t.Driver is null ? null : $"{t.Driver.FirstName} {t.Driver.LastName}",
            t.TruckId, t.Truck?.PlateNumber, t.StartedAt, t.CompletedAt, t.DistanceKm,
            t.FuelCost, t.Status, t.Notes, t.CreatedAt);
}
