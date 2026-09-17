using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace FleetManagement.Api.Routing;

/// <summary>
/// OpenRouteService directions client. Posts the waypoints and reads back the
/// GeoJSON LineString plus the distance/duration summary.
/// </summary>
public class OpenRouteServiceProvider(
    HttpClient http,
    IOptions<RoutingOptions> options,
    ILogger<OpenRouteServiceProvider> logger) : IRouteProvider
{
    private readonly RoutingOptions _options = options.Value;

    public bool IsConfigured => _options.IsConfigured;

    public async Task<RouteResult?> GetRouteAsync(IReadOnlyList<GeoPoint> waypoints, CancellationToken ct)
    {
        if (!IsConfigured || waypoints.Count < 2) return null;

        // ORS takes [longitude, latitude] pairs, not the usual lat/lon order.
        var body = new
        {
            coordinates = waypoints.Select(p => new[] { p.Longitude, p.Latitude }).ToArray()
        };

        try
        {
            using var response = await http.PostAsJsonAsync(
                $"/v2/directions/{_options.Profile}/geojson", body, ct);

            if (!response.IsSuccessStatusCode)
            {
                var detail = await response.Content.ReadAsStringAsync(ct);
                logger.LogWarning("Routing provider returned {Status}: {Detail}",
                    (int)response.StatusCode, detail[..Math.Min(detail.Length, 300)]);
                return null;
            }

            var payload = await response.Content.ReadFromJsonAsync<GeoJsonResponse>(ct);
            var feature = payload?.Features?.FirstOrDefault();
            if (feature?.Geometry?.Coordinates is not { Count: > 1 } coordinates) return null;

            var points = coordinates
                .Where(c => c.Count >= 2)
                .Select(c => new GeoPoint(c[0], c[1]))
                .ToList();

            var summary = feature.Properties?.Summary;

            return new RouteResult(
                points,
                Math.Round((decimal)((summary?.Distance ?? 0) / 1000), 2),
                (int)Math.Round((summary?.Duration ?? 0) / 60),
                "openrouteservice");
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            // A routing outage must not break the app — callers fall back to a straight line.
            logger.LogWarning(ex, "Routing provider unreachable");
            return null;
        }
    }

    private sealed record GeoJsonResponse(
        [property: JsonPropertyName("features")] List<Feature>? Features);

    private sealed record Feature(
        [property: JsonPropertyName("geometry")] Geometry? Geometry,
        [property: JsonPropertyName("properties")] Properties? Properties);

    private sealed record Geometry(
        [property: JsonPropertyName("coordinates")] List<List<double>>? Coordinates);

    private sealed record Properties(
        [property: JsonPropertyName("summary")] Summary? Summary);

    private sealed record Summary(
        [property: JsonPropertyName("distance")] double Distance,
        [property: JsonPropertyName("duration")] double Duration);
}
