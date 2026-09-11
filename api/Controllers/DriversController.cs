using FleetManagement.Api.Contracts;
using FleetManagement.Api.Domain;
using FleetManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.Api.Controllers;

[Route("api/drivers")]
[Tags("Drivers")]
public class DriversController(IDriverService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<DriverResponse>>> GetDrivers(
        [FromQuery] Guid? companyId, [FromQuery] Guid? truckId, [FromQuery] DriverStatus? status,
        [FromQuery] string? search, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct)
        => Ok(await service.GetAllAsync(companyId, truckId, status, search, page, pageSize, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDriver(Guid id, CancellationToken ct)
        => FromResult(await service.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<IActionResult> CreateDriver([FromBody] DriverRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        return FromCreated(result, $"/api/drivers/{result.Value?.Id}");
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateDriver(Guid id, [FromBody] DriverRequest request, CancellationToken ct)
        => FromResult(await service.UpdateAsync(id, request, ct));

    /// <summary>Assigns or clears the truck this driver normally drives.</summary>
    [HttpPut("{id:guid}/truck")]
    public async Task<IActionResult> AssignTruck(
        Guid id, [FromBody] AssignTruckRequest request, CancellationToken ct)
        => FromResult(await service.AssignTruckAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteDriver(Guid id, CancellationToken ct)
        => FromResult(await service.DeleteAsync(id, ct));
}
