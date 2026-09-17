using System.ComponentModel.DataAnnotations;
using FleetManagement.Api.Domain;

namespace FleetManagement.Api.Contracts;

public record LocationRequest(
    [Required, MaxLength(120)] string Name,
    [Required, MinLength(2), MaxLength(2)] string CountryCode,
    [Range(-90, 90)] double Latitude,
    [Range(-180, 180)] double Longitude);

public record LocationResponse(
    Guid Id,
    string Name,
    string CountryCode,
    double Latitude,
    double Longitude)
{
    public static LocationResponse From(Location l) =>
        new(l.Id, l.Name, l.CountryCode, l.Latitude, l.Longitude);
}
