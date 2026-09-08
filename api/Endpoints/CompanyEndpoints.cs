using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Endpoints;

public static class CompanyEndpoints
{
    public static RouteGroupBuilder MapCompanyEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/companies").WithTags("Companies");

        group.MapGet("/", async (
            AppDbContext db, string? search, int? page, int? pageSize, CancellationToken ct) =>
        {
            var query = db.Companies.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(x => EF.Functions.ILike(x.Name, $"%{search}%"));

            return Results.Ok(await query.OrderBy(x => x.Name)
                .ToPagedResultAsync(CompanyResponse.From, page, pageSize, ct));
        });

        group.MapGet("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await db.Companies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            return entity is null
                ? EndpointHelpers.NotFoundProblem("Company", id)
                : Results.Ok(CompanyResponse.From(entity));
        });

        group.MapPost("/", async (AppDbContext db, CompanyRequest request, CancellationToken ct) =>
        {
            var entity = new Company
            {
                Name = request.Name,
                TaxId = request.TaxId,
                Address = request.Address,
                Phone = request.Phone,
                Email = request.Email
            };

            db.Companies.Add(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.Created($"/api/companies/{entity.Id}", CompanyResponse.From(entity));
        });

        group.MapPut("/{id:guid}", async (AppDbContext db, Guid id, CompanyRequest request, CancellationToken ct) =>
        {
            var entity = await db.Companies.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("Company", id);

            entity.Name = request.Name;
            entity.TaxId = request.TaxId;
            entity.Address = request.Address;
            entity.Phone = request.Phone;
            entity.Email = request.Email;

            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.Ok(CompanyResponse.From(entity));
        });

        group.MapDelete("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await db.Companies.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("Company", id);

            db.Companies.Remove(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.NoContent();
        });

        return group;
    }
}
