using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Endpoints;

public static class CustomerEndpoints
{
    public static RouteGroupBuilder MapCustomerEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/customers").WithTags("Customers");

        group.MapGet("/", async (
            AppDbContext db, Guid? companyId, bool? isActive, string? search,
            int? page, int? pageSize, CancellationToken ct) =>
        {
            var query = db.Customers.AsNoTracking().AsQueryable();

            if (companyId is not null) query = query.Where(x => x.CompanyId == companyId);
            if (isActive is not null) query = query.Where(x => x.IsActive == isActive);
            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(x =>
                    EF.Functions.ILike(x.Name, $"%{search}%") ||
                    (x.ContactPerson != null && EF.Functions.ILike(x.ContactPerson, $"%{search}%")));

            return Results.Ok(await query.OrderBy(x => x.Name)
                .ToPagedResultAsync(CustomerResponse.From, page, pageSize, ct));
        });

        group.MapGet("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await db.Customers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            return entity is null
                ? EndpointHelpers.NotFoundProblem("Customer", id)
                : Results.Ok(CustomerResponse.From(entity));
        });

        group.MapPost("/", async (AppDbContext db, CustomerRequest request, CancellationToken ct) =>
        {
            if (!await db.Companies.AnyAsync(x => x.Id == request.CompanyId, ct))
                return EndpointHelpers.ReferenceProblem($"Company '{request.CompanyId}' does not exist.");

            var entity = new Customer { CompanyId = request.CompanyId };
            Apply(entity, request);

            db.Customers.Add(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.Created($"/api/customers/{entity.Id}", CustomerResponse.From(entity));
        });

        group.MapPut("/{id:guid}", async (AppDbContext db, Guid id, CustomerRequest request, CancellationToken ct) =>
        {
            var entity = await db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("Customer", id);

            if (entity.CompanyId != request.CompanyId &&
                !await db.Companies.AnyAsync(x => x.Id == request.CompanyId, ct))
                return EndpointHelpers.ReferenceProblem($"Company '{request.CompanyId}' does not exist.");

            entity.CompanyId = request.CompanyId;
            Apply(entity, request);

            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.Ok(CustomerResponse.From(entity));
        });

        group.MapDelete("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("Customer", id);

            db.Customers.Remove(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.NoContent();
        });

        return group;
    }

    private static void Apply(Customer entity, CustomerRequest request)
    {
        entity.Name = request.Name;
        entity.TaxId = request.TaxId;
        entity.ContactPerson = request.ContactPerson;
        entity.Phone = request.Phone;
        entity.Email = request.Email;
        entity.Address = request.Address;
        entity.Notes = request.Notes;
        entity.IsActive = request.IsActive;
    }
}
