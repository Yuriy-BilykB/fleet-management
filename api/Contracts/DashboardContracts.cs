namespace FleetManagement.Api.Contracts;

public record FleetSummary(
    int Total,
    int Available,
    int OnTrip,
    int InService,
    int ExpiringDocuments);

public record DriverSummary(
    int Total,
    int Active,
    int OnTrip,
    int ExpiringLicenses);

public record ShipmentSummary(
    int Total,
    int Draft,
    int Scheduled,
    int InTransit,
    int Delivered,
    int Cancelled);

public record DashboardResponse(
    FleetSummary Trucks,
    DriverSummary Drivers,
    ShipmentSummary Shipments,
    int ActiveCustomers,
    decimal ServiceCostThisMonth,
    IReadOnlyList<TripResponse> ActiveTrips,
    IReadOnlyList<ShipmentResponse> UpcomingShipments,
    IReadOnlyList<DocumentResponse> ExpiringDocuments);
