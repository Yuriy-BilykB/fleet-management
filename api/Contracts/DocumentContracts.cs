using System.ComponentModel.DataAnnotations;
using FleetManagement.Api.Domain;

namespace FleetManagement.Api.Contracts;

public record DocumentRequest(
    DocumentOwnerType OwnerType,
    Guid OwnerId,
    DocumentType Type,
    [Required, MaxLength(200)] string Title,
    [MaxLength(64)] string? Number,
    [MaxLength(1000)] string? FileUrl,
    DateOnly? IssuedOn,
    DateOnly? ExpiresOn,
    [MaxLength(1000)] string? Notes);

public record DocumentResponse(
    Guid Id,
    DocumentOwnerType OwnerType,
    Guid OwnerId,
    DocumentType Type,
    string Title,
    string? Number,
    string? FileUrl,
    DateOnly? IssuedOn,
    DateOnly? ExpiresOn,
    string? Notes,
    DateTimeOffset CreatedAt)
{
    public static DocumentResponse From(Document d) =>
        new(d.Id, d.OwnerType, d.TruckId ?? d.DriverId ?? d.ShipmentId ?? Guid.Empty, d.Type,
            d.Title, d.Number, d.FileUrl, d.IssuedOn, d.ExpiresOn, d.Notes, d.CreatedAt);
}
