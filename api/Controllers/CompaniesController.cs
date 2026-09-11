using FleetManagement.Api.Contracts;
using FleetManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.Api.Controllers;

[Route("api/companies")]
[Tags("Companies")]
public class CompaniesController(ICompanyService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<CompanyResponse>>> GetCompanies(
        [FromQuery] string? search, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct)
        => Ok(await service.GetAllAsync(search, page, pageSize, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetCompany(Guid id, CancellationToken ct)
        => FromResult(await service.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<IActionResult> CreateCompany([FromBody] CompanyRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        return FromCreated(result, $"/api/companies/{result.Value?.Id}");
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateCompany(
        Guid id, [FromBody] CompanyRequest request, CancellationToken ct)
        => FromResult(await service.UpdateAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteCompany(Guid id, CancellationToken ct)
        => FromResult(await service.DeleteAsync(id, ct));
}
