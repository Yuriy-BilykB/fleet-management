using FleetManagement.Api.Common;
using FleetManagement.Api.Contracts;
using FleetManagement.Api.Domain;

namespace FleetManagement.Api.Services;

public interface IDocumentService
{
    Task<PagedResult<DocumentResponse>> GetAllAsync(
        DocumentOwnerType? ownerType, Guid? ownerId, DocumentType? type, DateOnly? expiresBefore,
        int? page, int? pageSize, CancellationToken ct);
    Task<ServiceResult<DocumentResponse>> GetByIdAsync(Guid id, CancellationToken ct);
    Task<ServiceResult<DocumentResponse>> CreateAsync(DocumentRequest request, CancellationToken ct);
    Task<ServiceResult<DocumentResponse>> UpdateAsync(Guid id, DocumentRequest request, CancellationToken ct);
    Task<ServiceResult> DeleteAsync(Guid id, CancellationToken ct);
}
