using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Endpoints;

public static class DriverEndpoints
{
    public static RouteGroupBuilder MapDriverEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/drivers").WithTags("Drivers");

        group.MapGet("/", async (
            AppDbContext db, Guid? companyId, Guid? truckId, DriverStatus? status, string? search,
            int? page, int? pageSize, CancellationToken ct) =>
        {
            var query = db.Drivers.AsNoTracking().Include(x => x.AssignedTruck).AsQueryable();

            if (companyId is not null) query = query.Where(x => x.CompanyId == companyId);
            if (truckId is not null) query = query.Where(x => x.AssignedTruckId == truckId);
            if (status is not null) query = query.Where(x => x.Status == status);
            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(x =>
                    EF.Functions.ILike(x.FirstName, $"%{search}%") ||
                    EF.Functions.ILike(x.LastName, $"%{search}%") ||
                    EF.Functions.ILike(x.LicenseNumber, $"%{search}%"));

            return Results.Ok(await query.OrderBy(x => x.LastName).ThenBy(x => x.FirstName)
                .ToPagedResultAsync(DriverResponse.From, page, pageSize, ct));
        });

        group.MapGet("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await db.Drivers.AsNoTracking().Include(x => x.AssignedTruck)
                .FirstOrDefaultAsync(x => x.Id == id, ct);
            return entity is null
                ? EndpointHelpers.NotFoundProblem("Driver", id)
                : Results.Ok(DriverResponse.From(entity));
        });

        group.MapPost("/", async (AppDbContext db, DriverRequest request, CancellationToken ct) =>
        {
            if (await ValidateReferences(db, request, ct) is { } refProblem) return refProblem;

            var entity = new Driver { CompanyId = request.CompanyId };
            Apply(entity, request);

            db.Drivers.Add(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            await db.Entry(entity).Reference(x => x.AssignedTruck).LoadAsync(ct);
            return Results.Created($"/api/drivers/{entity.Id}", DriverResponse.From(entity));
        });

        group.MapPut("/{id:guid}", async (AppDbContext db, Guid id, DriverRequest request, CancellationToken ct) =>
        {
            var entity = await db.Drivers.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("Driver", id);

            if (await ValidateReferences(db, request, ct) is { } refProblem) return refProblem;

            entity.CompanyId = request.CompanyId;
            Apply(entity, request);

            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            await db.Entry(entity).Reference(x => x.AssignedTruck).LoadAsync(ct);
            return Results.Ok(DriverResponse.From(entity));
        });

        // Assign / unassign the truck a driver normally drives.
        group.MapPut("/{id:guid}/truck", async (
            AppDbContext db, Guid id, AssignTruckRequest request, CancellationToken ct) =>
        {
            var entity = await db.Drivers.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("Driver", id);

            if (request.TruckId is { } truckId)
            {
                var truck = await db.Trucks.FirstOrDefaultAsync(x => x.Id == truckId, ct);
                if (truck is null)
                    return EndpointHelpers.ReferenceProblem($"Truck '{truckId}' does not exist.");
                if (truck.CompanyId != entity.CompanyId)
                    return EndpointHelpers.ReferenceProblem("Truck belongs to a different company.");
            }

            entity.AssignedTruckId = request.TruckId;
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            await db.Entry(entity).Reference(x => x.AssignedTruck).LoadAsync(ct);
            return Results.Ok(DriverResponse.From(entity));
        });

        group.MapDelete("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await db.Drivers.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("Driver", id);

            db.Drivers.Remove(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.NoContent();
        });

        return group;
    }

    private static async Task<IResult?> ValidateReferences(AppDbContext db, DriverRequest request, CancellationToken ct)
    {
        if (!await db.Companies.AnyAsync(x => x.Id == request.CompanyId, ct))
            return EndpointHelpers.ReferenceProblem($"Company '{request.CompanyId}' does not exist.");

        if (request.AssignedTruckId is { } truckId)
        {
            var truck = await db.Trucks.AsNoTracking().FirstOrDefaultAsync(x => x.Id == truckId, ct);
            if (truck is null)
                return EndpointHelpers.ReferenceProblem($"Truck '{truckId}' does not exist.");
            if (truck.CompanyId != request.CompanyId)
                return EndpointHelpers.ReferenceProblem("Truck belongs to a different company.");
        }

        return null;
    }

    private static void Apply(Driver entity, DriverRequest request)
    {
        entity.AssignedTruckId = request.AssignedTruckId;
        entity.FirstName = request.FirstName;
        entity.LastName = request.LastName;
        entity.Phone = request.Phone;
        entity.Email = request.Email;
        entity.LicenseNumber = request.LicenseNumber;
        entity.LicenseExpiry = request.LicenseExpiry;
        entity.HiredOn = request.HiredOn;
        entity.Status = request.Status;
        entity.Notes = request.Notes;
    }
}
