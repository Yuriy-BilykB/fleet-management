using System.Text.Json.Serialization;
using FleetManagement.Api.Data;
using FleetManagement.Api.Hubs;
using FleetManagement.Api.Routing;
using Microsoft.Extensions.Options;
using FleetManagement.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

const string CorsPolicy = "web";

// Controllers. The JSON options must be set here — ConfigureHttpJsonOptions only
// applies to minimal APIs, so without this enums would serialise as numbers.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

// Application services — one per resource, resolved into the controllers.
builder.Services.AddScoped<ICompanyService, CompanyService>();
builder.Services.AddScoped<ITruckService, TruckService>();
builder.Services.AddScoped<IDriverService, DriverService>();
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<IShipmentService, ShipmentService>();
builder.Services.AddScoped<ITripService, TripService>();
builder.Services.AddScoped<IMaintenanceService, MaintenanceService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ILocationService, LocationService>();
builder.Services.AddScoped<ITripTrackingService, TripTrackingService>();
builder.Services.AddScoped<IRoutingService, RoutingService>();

// Road routing. Without an API key the provider reports itself unconfigured and
// callers fall back to straight lines, so the app still runs.
builder.Services.Configure<RoutingOptions>(builder.Configuration.GetSection(RoutingOptions.Section));
builder.Services.AddHttpClient<IRouteProvider, OpenRouteServiceProvider>((sp, client) =>
{
    var options = sp.GetRequiredService<IOptions<RoutingOptions>>().Value;
    client.BaseAddress = new Uri(options.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(20);
    // ORS sends a bare token, not "Bearer x" — the typed Authorization header
    // parser rejects that, so bypass validation.
    if (options.IsConfigured)
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", options.ApiKey);
});

// Live truck positions.
builder.Services.AddSignalR();
builder.Services.AddHostedService<TripSimulator>();

builder.Services.AddCors(options =>
    options.AddPolicy(CorsPolicy, policy => policy
        .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [])
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

var app = builder.Build();

if (builder.Configuration.GetValue("Database:AutoMigrate", false))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
}

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(CorsPolicy);

app.MapGet("/", () => Results.Ok(new { service = "FleetManagement.Api", status = "ok" }));

app.MapGet("/health", async (AppDbContext db, CancellationToken ct) =>
{
    var canConnect = await db.Database.CanConnectAsync(ct);
    return canConnect
        ? Results.Ok(new { status = "healthy", database = "up" })
        : Results.Problem("Database unreachable", statusCode: StatusCodes.Status503ServiceUnavailable);
});

app.MapControllers();
app.MapHub<TripTrackingHub>("/hubs/trips");

app.Run();
