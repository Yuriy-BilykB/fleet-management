using FleetManagement.Api.Contracts;
using FleetManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.Api.Controllers;

[Route("api/locations")]
[Tags("Locations")]
public class LocationsController(ILocationService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<LocationResponse>>> GetLocations(
        [FromQuery] string? search, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct)
        => Ok(await service.GetAllAsync(search, page, pageSize, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetLocation(Guid id, CancellationToken ct)
        => FromResult(await service.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<IActionResult> CreateLocation([FromBody] LocationRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        return FromCreated(result, $"/api/locations/{result.Value?.Id}");
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateLocation(
        Guid id, [FromBody] LocationRequest request, CancellationToken ct)
        => FromResult(await service.UpdateAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteLocation(Guid id, CancellationToken ct)
        => FromResult(await service.DeleteAsync(id, ct));
}
