using FleetManagement.Api.Contracts;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Common;

public static class QueryableExtensions
{
    public const int MaxPageSize = 200;

    public static (int Page, int PageSize) NormalizePaging(int? page, int? pageSize)
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
        var (p, s) = NormalizePaging(page, pageSize);
        var total = await query.CountAsync(ct);
        var items = await query.Skip((p - 1) * s).Take(s).ToListAsync(ct);
        return new PagedResult<TResult>(items.Select(map).ToList(), p, s, total);
    }
}
