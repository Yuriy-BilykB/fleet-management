using System.ComponentModel.DataAnnotations;
using FleetManagement.Api.Domain;

namespace FleetManagement.Api.Contracts;

public record TruckServiceRequest(
    Guid TruckId,
    TruckServiceType Type,
    [Required, MaxLength(1000)] string Description,
    DateOnly ServiceDate,
    [Range(0, 10000000)] decimal Cost,
    [Required, MinLength(3), MaxLength(3)] string Currency,
    [Range(0, int.MaxValue)] int? OdometerKm,
    [MaxLength(200)] string? Provider,
    DateOnly? NextServiceDate,
    [MaxLength(1000)] string? Notes);

public record TruckServiceResponse(
    Guid Id,
    Guid TruckId,
    string? TruckPlate,
    TruckServiceType Type,
    string Description,
    DateOnly ServiceDate,
    decimal Cost,
    string Currency,
    int? OdometerKm,
    string? Provider,
    DateOnly? NextServiceDate,
    string? Notes,
    DateTimeOffset CreatedAt)
{
    public static TruckServiceResponse From(TruckService s) =>
        new(s.Id, s.TruckId, s.Truck?.PlateNumber, s.Type, s.Description, s.ServiceDate, s.Cost,
            s.Currency, s.OdometerKm, s.Provider, s.NextServiceDate, s.Notes, s.CreatedAt);
}
