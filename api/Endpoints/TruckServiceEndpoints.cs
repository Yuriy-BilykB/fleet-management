using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Endpoints;

public static class TruckServiceEndpoints
{
    public static RouteGroupBuilder MapTruckServiceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/truck-services").WithTags("TruckServices");

        group.MapGet("/", async (
            AppDbContext db, Guid? truckId, Guid? companyId, TruckServiceType? type,
            DateOnly? from, DateOnly? to, int? page, int? pageSize, CancellationToken ct) =>
        {
            var query = db.TruckServices.AsNoTracking().Include(x => x.Truck).AsQueryable();

            if (truckId is not null) query = query.Where(x => x.TruckId == truckId);
            if (companyId is not null) query = query.Where(x => x.Truck.CompanyId == companyId);
            if (type is not null) query = query.Where(x => x.Type == type);
            if (from is not null) query = query.Where(x => x.ServiceDate >= from);
            if (to is not null) query = query.Where(x => x.ServiceDate <= to);

            return Results.Ok(await query.OrderByDescending(x => x.ServiceDate)
                .ToPagedResultAsync(TruckServiceResponse.From, page, pageSize, ct));
        });

        group.MapGet("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await db.TruckServices.AsNoTracking().Include(x => x.Truck)
                .FirstOrDefaultAsync(x => x.Id == id, ct);
            return entity is null
                ? EndpointHelpers.NotFoundProblem("TruckService", id)
                : Results.Ok(TruckServiceResponse.From(entity));
        });

        group.MapPost("/", async (AppDbContext db, TruckServiceRequest request, CancellationToken ct) =>
        {
            if (!await db.Trucks.AnyAsync(x => x.Id == request.TruckId, ct))
                return EndpointHelpers.ReferenceProblem($"Truck '{request.TruckId}' does not exist.");

            var entity = new TruckService();
            Apply(entity, request);

            db.TruckServices.Add(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            await db.Entry(entity).Reference(x => x.Truck).LoadAsync(ct);
            return Results.Created($"/api/truck-services/{entity.Id}", TruckServiceResponse.From(entity));
        });

        group.MapPut("/{id:guid}", async (AppDbContext db, Guid id, TruckServiceRequest request, CancellationToken ct) =>
        {
            var entity = await db.TruckServices.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("TruckService", id);

            if (entity.TruckId != request.TruckId &&
                !await db.Trucks.AnyAsync(x => x.Id == request.TruckId, ct))
                return EndpointHelpers.ReferenceProblem($"Truck '{request.TruckId}' does not exist.");

            Apply(entity, request);

            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            await db.Entry(entity).Reference(x => x.Truck).LoadAsync(ct);
            return Results.Ok(TruckServiceResponse.From(entity));
        });

        group.MapDelete("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await db.TruckServices.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("TruckService", id);

            db.TruckServices.Remove(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.NoContent();
        });

        return group;
    }

    private static void Apply(TruckService entity, TruckServiceRequest request)
    {
        entity.TruckId = request.TruckId;
        entity.Type = request.Type;
        entity.Description = request.Description;
        entity.ServiceDate = request.ServiceDate;
        entity.Cost = request.Cost;
        entity.Currency = request.Currency.ToUpperInvariant();
        entity.OdometerKm = request.OdometerKm;
        entity.Provider = request.Provider;
        entity.NextServiceDate = request.NextServiceDate;
        entity.Notes = request.Notes;
    }
}
