using FleetManagement.Api.Contracts;
using FleetManagement.Api.Domain;
using FleetManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.Api.Controllers;

[Route("api/truck-services")]
[Tags("TruckServices")]
public class TruckServicesController(IMaintenanceService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<TruckServiceResponse>>> GetTruckServices(
        [FromQuery] Guid? truckId, [FromQuery] Guid? companyId, [FromQuery] TruckServiceType? type,
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct)
        => Ok(await service.GetAllAsync(truckId, companyId, type, from, to, page, pageSize, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetTruckService(Guid id, CancellationToken ct)
        => FromResult(await service.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<IActionResult> CreateTruckService([FromBody] TruckServiceRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        return FromCreated(result, $"/api/truck-services/{result.Value?.Id}");
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateTruckService(
        Guid id, [FromBody] TruckServiceRequest request, CancellationToken ct)
        => FromResult(await service.UpdateAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTruckService(Guid id, CancellationToken ct)
        => FromResult(await service.DeleteAsync(id, ct));
}
