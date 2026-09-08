using System.ComponentModel.DataAnnotations;
using FleetManagement.Api.Domain;

namespace FleetManagement.Api.Contracts;

public record CustomerRequest(
    Guid CompanyId,
    [Required, MaxLength(200)] string Name,
    [MaxLength(32)] string? TaxId,
    [MaxLength(200)] string? ContactPerson,
    [MaxLength(32)] string? Phone,
    [EmailAddress, MaxLength(200)] string? Email,
    [MaxLength(400)] string? Address,
    [MaxLength(1000)] string? Notes,
    bool IsActive);

public record CustomerResponse(
    Guid Id,
    Guid CompanyId,
    string Name,
    string? TaxId,
    string? ContactPerson,
    string? Phone,
    string? Email,
    string? Address,
    string? Notes,
    bool IsActive,
    DateTimeOffset CreatedAt)
{
    public static CustomerResponse From(Customer c) =>
        new(c.Id, c.CompanyId, c.Name, c.TaxId, c.ContactPerson, c.Phone, c.Email,
            c.Address, c.Notes, c.IsActive, c.CreatedAt);
}
