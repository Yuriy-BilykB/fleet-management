using FleetManagement.Api.Contracts;
using FleetManagement.Api.Domain;
using FleetManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.Api.Controllers;

[Route("api/documents")]
[Tags("Documents")]
public class DocumentsController(IDocumentService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<DocumentResponse>>> GetDocuments(
        [FromQuery] DocumentOwnerType? ownerType, [FromQuery] Guid? ownerId,
        [FromQuery] DocumentType? type, [FromQuery] DateOnly? expiresBefore,
        [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct)
        => Ok(await service.GetAllAsync(ownerType, ownerId, type, expiresBefore, page, pageSize, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDocument(Guid id, CancellationToken ct)
        => FromResult(await service.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<IActionResult> CreateDocument([FromBody] DocumentRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        return FromCreated(result, $"/api/documents/{result.Value?.Id}");
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateDocument(Guid id, [FromBody] DocumentRequest request, CancellationToken ct)
        => FromResult(await service.UpdateAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteDocument(Guid id, CancellationToken ct)
        => FromResult(await service.DeleteAsync(id, ct));
}
