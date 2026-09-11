using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Services;

public class DashboardService(AppDbContext db) : IDashboardService
{
    private const int ExpiryWindowDays = 30;

    public async Task<DashboardResponse> GetSummaryAsync(Guid? companyId, CancellationToken ct)
    {
        var trucks = db.Trucks.AsNoTracking().AsQueryable();
        var drivers = db.Drivers.AsNoTracking().AsQueryable();
        var shipments = db.Shipments.AsNoTracking().AsQueryable();
        var trips = db.Trips.AsNoTracking().AsQueryable();
        var customers = db.Customers.AsNoTracking().AsQueryable();
        var services = db.TruckServices.AsNoTracking().AsQueryable();

        if (companyId is not null)
        {
            trucks = trucks.Where(x => x.CompanyId == companyId);
            drivers = drivers.Where(x => x.CompanyId == companyId);
            shipments = shipments.Where(x => x.CompanyId == companyId);
            trips = trips.Where(x => x.Shipment.CompanyId == companyId);
            customers = customers.Where(x => x.CompanyId == companyId);
            services = services.Where(x => x.Truck.CompanyId == companyId);
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var soon = today.AddDays(ExpiryWindowDays);
        var monthStart = new DateOnly(today.Year, today.Month, 1);

        var fleet = new FleetSummary(
            await trucks.CountAsync(ct),
            await trucks.CountAsync(x => x.Status == TruckStatus.Available, ct),
            await trucks.CountAsync(x => x.Status == TruckStatus.OnTrip, ct),
            await trucks.CountAsync(x => x.Status == TruckStatus.InService, ct),
            await trucks.CountAsync(x =>
                (x.InsuranceExpiry != null && x.InsuranceExpiry <= soon) ||
                (x.InspectionExpiry != null && x.InspectionExpiry <= soon), ct));

        var driverSummary = new DriverSummary(
            await drivers.CountAsync(ct),
            await drivers.CountAsync(x => x.Status == DriverStatus.Active, ct),
            await drivers.CountAsync(x => x.Status == DriverStatus.OnTrip, ct),
            await drivers.CountAsync(x => x.LicenseExpiry != null && x.LicenseExpiry <= soon, ct));

        var shipmentSummary = new ShipmentSummary(
            await shipments.CountAsync(ct),
            await shipments.CountAsync(x => x.Status == ShipmentStatus.Draft, ct),
            await shipments.CountAsync(x => x.Status == ShipmentStatus.Scheduled, ct),
            await shipments.CountAsync(x => x.Status == ShipmentStatus.InTransit, ct),
            await shipments.CountAsync(x => x.Status == ShipmentStatus.Delivered, ct),
            await shipments.CountAsync(x => x.Status == ShipmentStatus.Cancelled, ct));

        var activeTrips = await trips
            .Include(x => x.Shipment).Include(x => x.Driver).Include(x => x.Truck)
            .Where(x => x.Status == TripStatus.InProgress || x.Status == TripStatus.Planned)
            .OrderBy(x => x.StartedAt ?? x.CreatedAt)
            .Take(20)
            .ToListAsync(ct);

        var upcoming = await shipments
            .Include(x => x.Customer)
            .Where(x => x.Status == ShipmentStatus.Scheduled || x.Status == ShipmentStatus.Draft)
            .OrderBy(x => x.PickupDate)
            .Take(10)
            .ToListAsync(ct);

        var expiring = await db.Documents.AsNoTracking()
            .Where(x => x.ExpiresOn != null && x.ExpiresOn <= soon)
            .OrderBy(x => x.ExpiresOn)
            .Take(10)
            .ToListAsync(ct);

        return new DashboardResponse(
            fleet,
            driverSummary,
            shipmentSummary,
            await customers.CountAsync(x => x.IsActive, ct),
            await services.Where(x => x.ServiceDate >= monthStart).SumAsync(x => (decimal?)x.Cost, ct) ?? 0m,
            activeTrips.Select(TripResponse.From).ToList(),
            upcoming.Select(ShipmentResponse.From).ToList(),
            expiring.Select(DocumentResponse.From).ToList());
    }

    /// <summary>
    /// Monthly service spend, aggregated by Postgres. Grouping in SQL rather than
    /// in the caller keeps it correct regardless of how many records exist.
    /// </summary>
    public async Task<IReadOnlyList<ServiceSpendPoint>> GetServiceSpendAsync(
        Guid? companyId, int? months, CancellationToken ct)
    {
        var window = Math.Clamp(months ?? 6, 1, 36);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var start = new DateOnly(today.Year, today.Month, 1).AddMonths(-(window - 1));

        var query = db.TruckServices.AsNoTracking().Where(x => x.ServiceDate >= start);
        if (companyId is not null) query = query.Where(x => x.Truck.CompanyId == companyId);

        var totals = await query
            .GroupBy(x => new { x.ServiceDate.Year, x.ServiceDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(x => x.Cost) })
            .ToListAsync(ct);

        var byMonth = totals.ToDictionary(x => (x.Year, x.Month), x => x.Total);

        // A month with no work must still appear as zero, or the chart skips it.
        return Enumerable.Range(0, window)
            .Select(offset => start.AddMonths(offset))
            .Select(month => new ServiceSpendPoint(
                $"{month.Year:D4}-{month.Month:D2}",
                byMonth.TryGetValue((month.Year, month.Month), out var total) ? total : 0m))
            .ToList();
    }
}
