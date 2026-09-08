using FleetManagement.Api.Contracts;
using FleetManagement.Api.Data;
using FleetManagement.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Api.Endpoints;

public static class DashboardEndpoints
{
    public static RouteGroupBuilder MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/dashboard").WithTags("Dashboard");

        group.MapGet("/", async (AppDbContext db, Guid? companyId, CancellationToken ct) =>
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
            var soon = today.AddDays(30);
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

            var response = new DashboardResponse(
                fleet,
                driverSummary,
                shipmentSummary,
                await customers.CountAsync(x => x.IsActive, ct),
                await services.Where(x => x.ServiceDate >= monthStart).SumAsync(x => (decimal?)x.Cost, ct) ?? 0m,
                activeTrips.Select(TripResponse.From).ToList(),
                upcoming.Select(ShipmentResponse.From).ToList(),
                expiring.Select(DocumentResponse.From).ToList());

            return Results.Ok(response);
        });

        return group;
    }
}
