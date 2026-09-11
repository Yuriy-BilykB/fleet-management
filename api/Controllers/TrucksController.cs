using FleetManagement.Api.Contracts;
using FleetManagement.Api.Domain;
using FleetManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.Api.Controllers;

[Route("api/trucks")]
[Tags("Trucks")]
public class TrucksController(ITruckService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<TruckResponse>>> GetTrucks(
        [FromQuery] Guid? companyId, [FromQuery] TruckStatus? status, [FromQuery] string? search,
        [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct)
        => Ok(await service.GetAllAsync(companyId, status, search, page, pageSize, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetTruck(Guid id, CancellationToken ct)
        => FromResult(await service.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<IActionResult> CreateTruck([FromBody] TruckRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        return FromCreated(result, $"/api/trucks/{result.Value?.Id}");
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateTruck(Guid id, [FromBody] TruckRequest request, CancellationToken ct)
        => FromResult(await service.UpdateAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTruck(Guid id, CancellationToken ct)
        => FromResult(await service.DeleteAsync(id, ct));
}
