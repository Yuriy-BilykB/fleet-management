using FleetManagement.Api.Contracts;
using FleetManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.Api.Controllers;

[Route("api/dashboard")]
[Tags("Dashboard")]
public class DashboardController(IDashboardService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DashboardResponse>> GetDashboard(
        [FromQuery] Guid? companyId, CancellationToken ct)
        => Ok(await service.GetSummaryAsync(companyId, ct));

    [HttpGet("service-spend")]
    public async Task<ActionResult<IReadOnlyList<ServiceSpendPoint>>> GetServiceSpend(
        [FromQuery] Guid? companyId, [FromQuery] int? months, CancellationToken ct)
        => Ok(await service.GetServiceSpendAsync(companyId, months, ct));
}
