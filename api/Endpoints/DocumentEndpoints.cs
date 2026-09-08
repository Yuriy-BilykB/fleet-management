using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Endpoints;

public static class DocumentEndpoints
{
    public static RouteGroupBuilder MapDocumentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/documents").WithTags("Documents");

        group.MapGet("/", async (
            AppDbContext db, DocumentOwnerType? ownerType, Guid? ownerId, DocumentType? type,
            DateOnly? expiresBefore, int? page, int? pageSize, CancellationToken ct) =>
        {
            var query = db.Documents.AsNoTracking().AsQueryable();

            if (ownerType is not null) query = query.Where(x => x.OwnerType == ownerType);
            if (ownerId is not null)
                query = query.Where(x =>
                    x.TruckId == ownerId || x.DriverId == ownerId || x.ShipmentId == ownerId);
            if (type is not null) query = query.Where(x => x.Type == type);
            if (expiresBefore is not null)
                query = query.Where(x => x.ExpiresOn != null && x.ExpiresOn <= expiresBefore);

            return Results.Ok(await query.OrderByDescending(x => x.CreatedAt)
                .ToPagedResultAsync(DocumentResponse.From, page, pageSize, ct));
        });

        group.MapGet("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await db.Documents.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            return entity is null
                ? EndpointHelpers.NotFoundProblem("Document", id)
                : Results.Ok(DocumentResponse.From(entity));
        });

        group.MapPost("/", async (AppDbContext db, DocumentRequest request, CancellationToken ct) =>
        {
            if (await ValidateOwner(db, request, ct) is { } refProblem) return refProblem;

            var entity = new Document();
            Apply(entity, request);

            db.Documents.Add(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.Created($"/api/documents/{entity.Id}", DocumentResponse.From(entity));
        });

        group.MapPut("/{id:guid}", async (AppDbContext db, Guid id, DocumentRequest request, CancellationToken ct) =>
        {
            var entity = await db.Documents.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("Document", id);

            if (await ValidateOwner(db, request, ct) is { } refProblem) return refProblem;

            Apply(entity, request);

            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.Ok(DocumentResponse.From(entity));
        });

        group.MapDelete("/{id:guid}", async (AppDbContext db, Guid id, CancellationToken ct) =>
        {
            var entity = await db.Documents.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (entity is null) return EndpointHelpers.NotFoundProblem("Document", id);

            db.Documents.Remove(entity);
            if (await db.TrySaveAsync(ct) is { } problem) return problem;

            return Results.NoContent();
        });

        return group;
    }

    private static async Task<IResult?> ValidateOwner(AppDbContext db, DocumentRequest request, CancellationToken ct)
    {
        var exists = request.OwnerType switch
        {
            DocumentOwnerType.Truck => await db.Trucks.AnyAsync(x => x.Id == request.OwnerId, ct),
            DocumentOwnerType.Driver => await db.Drivers.AnyAsync(x => x.Id == request.OwnerId, ct),
            DocumentOwnerType.Shipment => await db.Shipments.AnyAsync(x => x.Id == request.OwnerId, ct),
            _ => false
        };

        if (!exists)
            return EndpointHelpers.ReferenceProblem(
                $"{request.OwnerType} '{request.OwnerId}' does not exist.");

        if (request.ExpiresOn is { } expires && request.IssuedOn is { } issued && expires < issued)
            return EndpointHelpers.ReferenceProblem("ExpiresOn must not be earlier than IssuedOn.");

        return null;
    }

    private static void Apply(Document entity, DocumentRequest request)
    {
        entity.OwnerType = request.OwnerType;
        entity.TruckId = request.OwnerType == DocumentOwnerType.Truck ? request.OwnerId : null;
        entity.DriverId = request.OwnerType == DocumentOwnerType.Driver ? request.OwnerId : null;
        entity.ShipmentId = request.OwnerType == DocumentOwnerType.Shipment ? request.OwnerId : null;
        entity.Type = request.Type;
        entity.Title = request.Title;
        entity.Number = request.Number;
        entity.FileUrl = request.FileUrl;
        entity.IssuedOn = request.IssuedOn;
        entity.ExpiresOn = request.ExpiresOn;
        entity.Notes = request.Notes;
    }
}
