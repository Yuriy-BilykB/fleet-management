using FleetManagement.Api.Contracts;
using FleetManagement.Api.Domain;
using FleetManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.Api.Controllers;

[Route("api/shipments")]
[Tags("Shipments")]
public class ShipmentsController(IShipmentService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<ShipmentResponse>>> GetShipments(
        [FromQuery] Guid? companyId, [FromQuery] Guid? customerId, [FromQuery] ShipmentStatus? status,
        [FromQuery] string? search, [FromQuery] DateTimeOffset? pickupFrom,
        [FromQuery] DateTimeOffset? pickupTo, [FromQuery] int? page, [FromQuery] int? pageSize,
        CancellationToken ct)
        => Ok(await service.GetAllAsync(
            companyId, customerId, status, search, pickupFrom, pickupTo, page, pageSize, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetShipment(Guid id, CancellationToken ct)
        => FromResult(await service.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<IActionResult> CreateShipment([FromBody] ShipmentRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        return FromCreated(result, $"/api/shipments/{result.Value?.Id}");
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateShipment(Guid id, [FromBody] ShipmentRequest request, CancellationToken ct)
        => FromResult(await service.UpdateAsync(id, request, ct));

    /// <summary>Assigns a driver and truck by creating the trip for this shipment.</summary>
    [HttpPost("{id:guid}/assign")]
    public async Task<IActionResult> AssignShipment(
        Guid id, [FromBody] AssignShipmentRequest request, CancellationToken ct)
    {
        var result = await service.AssignAsync(id, request, ct);
        return FromCreated(result, $"/api/trips/{result.Value?.Id}");
    }

    [HttpGet("{id:guid}/trips")]
    public async Task<IActionResult> GetShipmentTrips(Guid id, CancellationToken ct)
        => FromResult(await service.GetTripsAsync(id, ct));

    /// <summary>Intermediate waypoints between origin and destination, in route order.</summary>
    [HttpGet("{id:guid}/stops")]
    public async Task<IActionResult> GetShipmentStops(Guid id, CancellationToken ct)
        => FromResult(await service.GetStopsAsync(id, ct));

    [HttpPost("{id:guid}/stops")]
    public async Task<IActionResult> AddShipmentStop(
        Guid id, [FromBody] ShipmentStopRequest request, CancellationToken ct)
    {
        var result = await service.AddStopAsync(id, request, ct);
        return FromCreated(result, $"/api/shipments/{id}/stops");
    }

    [HttpDelete("{id:guid}/stops/{stopId:guid}")]
    public async Task<IActionResult> RemoveShipmentStop(Guid id, Guid stopId, CancellationToken ct)
        => FromResult(await service.RemoveStopAsync(id, stopId, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteShipment(Guid id, CancellationToken ct)
        => FromResult(await service.DeleteAsync(id, ct));
}
