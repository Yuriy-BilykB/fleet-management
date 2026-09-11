using FleetManagement.Api.Contracts;
using FleetManagement.Api.Domain;
using FleetManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.Api.Controllers;

[Route("api/trips")]
[Tags("Trips")]
public class TripsController(ITripService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<TripResponse>>> GetTrips(
        [FromQuery] Guid? shipmentId, [FromQuery] Guid? driverId, [FromQuery] Guid? truckId,
        [FromQuery] TripStatus? status, [FromQuery] int? page, [FromQuery] int? pageSize,
        CancellationToken ct)
        => Ok(await service.GetAllAsync(shipmentId, driverId, truckId, status, page, pageSize, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetTrip(Guid id, CancellationToken ct)
        => FromResult(await service.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<IActionResult> CreateTrip([FromBody] TripRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        return FromCreated(result, $"/api/trips/{result.Value?.Id}");
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateTrip(Guid id, [FromBody] TripRequest request, CancellationToken ct)
        => FromResult(await service.UpdateAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTrip(Guid id, CancellationToken ct)
        => FromResult(await service.DeleteAsync(id, ct));
}
