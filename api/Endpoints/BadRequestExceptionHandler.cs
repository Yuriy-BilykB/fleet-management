using Microsoft.AspNetCore.Diagnostics;

namespace FleetManagement.Api.Endpoints;

/// <summary>
/// Renders malformed request bodies (bad JSON, unknown enum values) as 400 Problem Details.
/// Without this, <see cref="BadHttpRequestException"/> reaches the default handler as a 500.
/// </summary>
public class BadRequestExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not BadHttpRequestException badRequest)
            return false;

        httpContext.Response.StatusCode = badRequest.StatusCode;

        await httpContext.Response.WriteAsJsonAsync(new
        {
            type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
            title = "Invalid request",
            status = badRequest.StatusCode,
            detail = badRequest.InnerException?.Message ?? badRequest.Message
        }, cancellationToken);

        return true;
    }
}
