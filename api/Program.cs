using System.Text.Json.Serialization;
using FleetManagement.Api.Data;
using FleetManagement.Api.Endpoints;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

const string CorsPolicy = "web";

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<BadRequestExceptionHandler>();
builder.Services.AddValidation();

builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddCors(options =>
    options.AddPolicy(CorsPolicy, policy => policy
        .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [])
        .AllowAnyHeader()
        .AllowAnyMethod()));

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

app.MapCompanyEndpoints();
app.MapTruckEndpoints();
app.MapDriverEndpoints();
app.MapCustomerEndpoints();
app.MapShipmentEndpoints();
app.MapTripEndpoints();
app.MapTruckServiceEndpoints();
app.MapDocumentEndpoints();
app.MapDashboardEndpoints();

app.Run();
