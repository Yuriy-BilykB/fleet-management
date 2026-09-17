namespace FleetManagement.Api.Routing;

public class RoutingOptions
{
    public const string Section = "Routing";

    /// <summary>OpenRouteService API key. Without it the app falls back to straight lines.</summary>
    public string? ApiKey { get; set; }
    public string BaseUrl { get; set; } = "https://api.openrouteservice.org";
    /// <summary>ORS profile — "driving-hgv" is the heavy-goods one; "driving-car" also works.</summary>
    public string Profile { get; set; } = "driving-hgv";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
}
