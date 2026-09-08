using System.ComponentModel.DataAnnotations;
using FleetManagement.Api.Domain;

namespace FleetManagement.Api.Contracts;

public record CompanyRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(32)] string? TaxId,
    [MaxLength(400)] string? Address,
    [MaxLength(32)] string? Phone,
    [EmailAddress, MaxLength(200)] string? Email);

public record CompanyResponse(
    Guid Id,
    string Name,
    string? TaxId,
    string? Address,
    string? Phone,
    string? Email,
    DateTimeOffset CreatedAt)
{
    public static CompanyResponse From(Company c) =>
        new(c.Id, c.Name, c.TaxId, c.Address, c.Phone, c.Email, c.CreatedAt);
}
