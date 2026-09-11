using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Services;

public class DocumentService(AppDbContext db) : IDocumentService
{
    public async Task<PagedResult<DocumentResponse>> GetAllAsync(
        DocumentOwnerType? ownerType, Guid? ownerId, DocumentType? type, DateOnly? expiresBefore,
        int? page, int? pageSize, CancellationToken ct)
    {
        var query = db.Documents.AsNoTracking().AsQueryable();

        if (ownerType is not null) query = query.Where(x => x.OwnerType == ownerType);
        if (ownerId is not null)
            query = query.Where(x =>
                x.TruckId == ownerId || x.DriverId == ownerId || x.ShipmentId == ownerId);
        if (type is not null) query = query.Where(x => x.Type == type);
        if (expiresBefore is not null)
            query = query.Where(x => x.ExpiresOn != null && x.ExpiresOn <= expiresBefore);

        return await query.OrderByDescending(x => x.CreatedAt)
            .ToPagedResultAsync(DocumentResponse.From, page, pageSize, ct);
    }

    public async Task<ServiceResult<DocumentResponse>> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Documents.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return entity is null
            ? ServiceResult<DocumentResponse>.NotFound("Document", id)
            : ServiceResult<DocumentResponse>.Success(DocumentResponse.From(entity));
    }

    public async Task<ServiceResult<DocumentResponse>> CreateAsync(
        DocumentRequest request, CancellationToken ct)
    {
        if (await ValidateOwnerAsync(request, ct) is { } problem)
            return ServiceResult<DocumentResponse>.From(problem);

        var entity = new Document();
        Apply(entity, request);
        db.Documents.Add(entity);

        var saved = await db.TrySaveAsync(ct);
        return saved.IsSuccess
            ? ServiceResult<DocumentResponse>.Success(DocumentResponse.From(entity))
            : ServiceResult<DocumentResponse>.From(saved);
    }

    public async Task<ServiceResult<DocumentResponse>> UpdateAsync(
        Guid id, DocumentRequest request, CancellationToken ct)
    {
        var entity = await db.Documents.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult<DocumentResponse>.NotFound("Document", id);

        if (await ValidateOwnerAsync(request, ct) is { } problem)
            return ServiceResult<DocumentResponse>.From(problem);

        Apply(entity, request);

        var saved = await db.TrySaveAsync(ct);
        return saved.IsSuccess
            ? ServiceResult<DocumentResponse>.Success(DocumentResponse.From(entity))
            : ServiceResult<DocumentResponse>.From(saved);
    }

    public async Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Documents.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return ServiceResult.NotFound("Document", id);

        db.Documents.Remove(entity);
        return await db.TrySaveAsync(ct);
    }

    private async Task<ServiceResult?> ValidateOwnerAsync(DocumentRequest request, CancellationToken ct)
    {
        var exists = request.OwnerType switch
        {
            DocumentOwnerType.Truck => await db.Trucks.AnyAsync(x => x.Id == request.OwnerId, ct),
            DocumentOwnerType.Driver => await db.Drivers.AnyAsync(x => x.Id == request.OwnerId, ct),
            DocumentOwnerType.Shipment => await db.Shipments.AnyAsync(x => x.Id == request.OwnerId, ct),
            _ => false
        };

        if (!exists)
            return ServiceResult.Invalid($"{request.OwnerType} '{request.OwnerId}' does not exist.");

        if (request.ExpiresOn is { } expires && request.IssuedOn is { } issued && expires < issued)
            return ServiceResult.Invalid("ExpiresOn must not be earlier than IssuedOn.");

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
