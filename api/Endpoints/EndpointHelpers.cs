using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FleetManagement.Api.Endpoints;

public static class EndpointHelpers
{
    public const int MaxPageSize = 200;

    public static (int Page, int PageSize) Normalize(int? page, int? pageSize)
    {
        var p = page is null or < 1 ? 1 : page.Value;
        var s = pageSize is null or < 1 ? 25 : Math.Min(pageSize.Value, MaxPageSize);
        return (p, s);
    }

    public static async Task<PagedResult<TResult>> ToPagedResultAsync<TSource, TResult>(
        this IQueryable<TSource> query,
        Func<TSource, TResult> map,
        int? page,
        int? pageSize,
        CancellationToken ct)
    {
        var (p, s) = Normalize(page, pageSize);
        var total = await query.CountAsync(ct);
        var items = await query.Skip((p - 1) * s).Take(s).ToListAsync(ct);
        return new PagedResult<TResult>(items.Select(map).ToList(), p, s, total);
    }

    /// <summary>
    /// Saves changes, translating Postgres foreign-key / unique / check violations
    /// into 409 responses instead of a 500.
    /// </summary>
    public static async Task<IResult?> TrySaveAsync(this AppDbContext db, CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
            return null;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg)
        {
            var detail = pg.SqlState switch
            {
                PostgresErrorCodes.UniqueViolation => "A record with the same unique value already exists.",
                PostgresErrorCodes.ForeignKeyViolation or PostgresErrorCodes.RestrictViolation =>
                    "The record is referenced by other records, or a referenced record does not exist.",
                PostgresErrorCodes.CheckViolation => "The record violates a database constraint.",
                _ => pg.MessageText
            };

            return Results.Problem(
                title: "Conflict",
                detail: detail,
                statusCode: StatusCodes.Status409Conflict);
        }
    }

    public static IResult NotFoundProblem(string entity, Guid id) =>
        Results.Problem(
            title: "Not found",
            detail: $"{entity} '{id}' was not found.",
            statusCode: StatusCodes.Status404NotFound);

    public static IResult ReferenceProblem(string message) =>
        Results.Problem(
            title: "Invalid reference",
            detail: message,
            statusCode: StatusCodes.Status400BadRequest);
}
