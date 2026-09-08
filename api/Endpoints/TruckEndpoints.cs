using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Endpoints;

public static class TruckEndpoints
{
    public static RouteGroupBuilder MapTruckEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/trucks").WithTags("Trucks");

        group.MapGet("/", async (
            AppDbContext db, Guid? companyId, TruckStatus? status, string? search,
            int? page, int? pageSize, CancellationToken ct) =>
        {
            var query = db.Trucks.AsNoTracking().AsQueryable();

            if (companyId is not null) query = query.Where(x => x.CompanyId == companyId);
            if (status is not null) query = query.Where(x => x.Status == status);
            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(x =>
                    EF.Functions.ILike(x.PlateNumber, $"%{search}%") ||
                    EF.Functions.ILike(x.Make, $"%{search}%") ||
                    EF.Functions.ILike(x.Model, $"%{search}%"));

            return Results.Ok(await query.OrderBy(x => x.PlateNumber)
                .ToPagedResultAsync(TruckResponse.From, page, pageSize, ct));
        });

        group.MapGet("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await db.Trucks.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            return entity is null
                ? EndpointHelpers.NotFoundProblem("Truck", id)
                : Results.Ok(TruckResponse.From(entity));
        });

        group.MapPost("/", async (AppDbContext db, TruckRequest request, CancellationToken ct) =>
        {
            if (!await db.Companies.AnyAsync(x => x.Id == request.CompanyId, ct))
                return EndpointHelpers.ReferenceProblem($"Company '{request.CompanyId}' does not exist.");

            var entity = new Truck { CompanyId = request.CompanyId };
            Apply(entity, request);

            db.Trucks.Add(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.Created($"/api/trucks/{entity.Id}", TruckResponse.From(entity));
        });

        group.MapPut("/{id:guid}", async (AppDbContext db, Guid id, TruckRequest request, CancellationToken ct) =>
        {
            var entity = await db.Trucks.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("Truck", id);

            if (entity.CompanyId != request.CompanyId &&
                !await db.Companies.AnyAsync(x => x.Id == request.CompanyId, ct))
                return EndpointHelpers.ReferenceProblem($"Company '{request.CompanyId}' does not exist.");

            entity.CompanyId = request.CompanyId;
            Apply(entity, request);

            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.Ok(TruckResponse.From(entity));
        });

        group.MapDelete("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await db.Trucks.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("Truck", id);

            db.Trucks.Remove(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.NoContent();
        });

        return group;
    }

    private static void Apply(Truck entity, TruckRequest request)
    {
        entity.PlateNumber = request.PlateNumber;
        entity.Make = request.Make;
        entity.Model = request.Model;
        entity.Vin = request.Vin;
        entity.Year = request.Year;
        entity.CapacityKg = request.CapacityKg;
        entity.OdometerKm = request.OdometerKm;
        entity.Status = request.Status;
        entity.InsuranceExpiry = request.InsuranceExpiry;
        entity.InspectionExpiry = request.InspectionExpiry;
        entity.Notes = request.Notes;
    }
}
