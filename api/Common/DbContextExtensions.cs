using FleetManagement.Api.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FleetManagement.Api.Common;

public static class DbContextExtensions
{
    /// <summary>
    /// Saves changes, translating Postgres unique / foreign-key / check violations
    /// into a Conflict result instead of letting them surface as a 500.
    /// </summary>
    public static async Task<ServiceResult> TrySaveAsync(this AppDbContext db, CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
            return ServiceResult.Success();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg)
        {
            return ServiceResult.Conflict(pg.SqlState switch
            {
                PostgresErrorCodes.UniqueViolation =>
                    "A record with the same unique value already exists.",
                PostgresErrorCodes.ForeignKeyViolation or PostgresErrorCodes.RestrictViolation =>
                    "The record is referenced by other records, or a referenced record does not exist.",
                PostgresErrorCodes.CheckViolation =>
                    "The record violates a database constraint.",
                _ => pg.MessageText
            });
        }
    }
}
