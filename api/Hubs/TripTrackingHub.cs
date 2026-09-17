using Microsoft.AspNetCore.SignalR;

namespace FleetManagement.Api.Hubs;

/// <summary>
/// Live truck positions. Groups are per truck, not per trip: telematics reports on
/// vehicles, and a map watching a trip simply follows that trip's truck.
/// </summary>
public class TripTrackingHub : Hub
{
    public static string GroupFor(Guid truckId) => $"truck-{truckId}";

    public Task JoinTruck(Guid truckId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, GroupFor(truckId));

    public Task LeaveTruck(Guid truckId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupFor(truckId));
}
