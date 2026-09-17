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

public record TruckPositionResponse(
    Guid Id,
    Guid TruckId,
    double Latitude,
    double Longitude,
    double? SpeedKmh,
    double? HeadingDeg,
    double? OdometerKm,
    string Source,
    DateTimeOffset RecordedAt)
{
    public static TruckPositionResponse From(TruckPosition p) =>
        new(p.Id, p.TruckId, p.Latitude, p.Longitude, p.SpeedKmh, p.HeadingDeg,
            p.OdometerKm, p.Source, p.RecordedAt);
}

/// <summary>The planned straight-line route plus the fixes recorded so far.</summary>
public record TripTrackResponse(
    Guid TripId,
    double? OriginLatitude,
    double? OriginLongitude,
    string? OriginName,
    double? DestinationLatitude,
    double? DestinationLongitude,
    string? DestinationName,
    /// <summary>Road geometry as [latitude, longitude] pairs, ready for Leaflet.</summary>
    IReadOnlyList<double[]> RouteGeometry,
    decimal? RouteDistanceKm,
    int? RouteDurationMinutes,
    string? RouteProvider,
    IReadOnlyList<TripStopResponse> Stops,
    /// <summary>The truck being followed — the client subscribes to its position feed.</summary>
    Guid TruckId,
    IReadOnlyList<TruckPositionResponse> Positions);

public record TripStopResponse(int Sequence, string Name, double Latitude, double Longitude);
