using FleetManagement.Api.Common;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.Api.Controllers;

/// <summary>
/// Translates the service layer's <see cref="ServiceResult"/> into HTTP. This is
/// the only place that knows a "not found" is a 404 — services stay HTTP-free.
/// </summary>
[ApiController]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
    protected IActionResult FromResult<T>(ServiceResult<T> result) =>
        result.Status switch
        {
            ServiceStatus.Success => Ok(result.Value),
            _ => Failure(result)
        };

    protected IActionResult FromResult(ServiceResult result) =>
        result.IsSuccess ? NoContent() : Failure(result);

    protected IActionResult FromCreated<T>(ServiceResult<T> result, string location) =>
        result.Status switch
        {
            ServiceStatus.Success => Created(location, result.Value),
            _ => Failure(result)
        };

    private IActionResult Failure(ServiceResult result) =>
        result.Status switch
        {
            ServiceStatus.NotFound => Problem(
                title: "Not found", detail: result.Error, statusCode: StatusCodes.Status404NotFound),
            ServiceStatus.Invalid => Problem(
                title: "Invalid reference", detail: result.Error, statusCode: StatusCodes.Status400BadRequest),
            ServiceStatus.Conflict => Problem(
                title: "Conflict", detail: result.Error, statusCode: StatusCodes.Status409Conflict),
            _ => Problem(
                title: "Request failed", detail: result.Error, statusCode: StatusCodes.Status500InternalServerError)
        };
}
