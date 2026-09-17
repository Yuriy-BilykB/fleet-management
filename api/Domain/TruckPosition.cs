namespace FleetManagement.Api.Domain;

/// <summary>
/// One GPS fix for a truck. Append-only, and deliberately tied to the truck rather
/// than a trip: real telematics reports per vehicle around the clock and knows
/// nothing about our trips. A trip's track is the slice of these within its window.
/// </summary>
public class TruckPosition
{
    public Guid Id { get; set; }
    public Guid TruckId { get; set; }

    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? SpeedKmh { get; set; }
    public double? HeadingDeg { get; set; }
    public double? OdometerKm { get; set; }

    /// <summary>Where the fix came from — "simulator" today, a provider name later.</summary>
    public string Source { get; set; } = "simulator";

    /// <summary>
    /// When the truck was there, not when we received it. Feeds arrive late and out
    /// of order after tunnels and border crossings, so ordering must use this.
    /// </summary>
    public DateTimeOffset RecordedAt { get; set; }

    public Truck Truck { get; set; } = null!;
}
