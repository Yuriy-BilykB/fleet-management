# Fleet Management

Internal web app for a logistics company: fleet, drivers, customers and shipments.

- **api/** — ASP.NET Core (.NET 10) controllers + services, EF Core + Npgsql
- **web/** — React 19 + TypeScript (Vite), served by nginx in Docker
  — TanStack Query · Axios · React Router · shadcn/ui + Tailwind v4 ·
  React Hook Form + Zod · TanStack Table · Recharts · Lucide
- **db** — PostgreSQL 18

Seed data is Danish/Nordic and priced in EUR; the UI formats with `en-GB`.

## Run with Docker Compose

```bash
cp .env.example .env   # optional, defaults are baked in
docker compose up --build
```

| Service | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:8080 |
| Postgres | localhost:5432 |

The nginx container proxies `/api/*` to the API (prefix preserved — the API namespaces
its own routes under `/api`), so the browser makes same-origin requests.

Stop with `docker compose down` (add `-v` to drop the database volume).

## Run locally without Docker

Start just the database:

```bash
docker compose up -d db
```

API (http://localhost:5272):

```bash
cd api
dotnet run
```

Web (http://localhost:5173, proxies `/api` to the API):

```bash
cd web
npm install
npm run dev
```

## Domain model

```
Company ─┬─< Truck ──┬─< TruckService
         │           ├─< Document
         │           └─< Trip
         ├─< Driver ─┬─< Document        Driver.AssignedTruckId ──> Truck (nullable)
         │           └─< Trip
         ├─< Customer ──< Shipment ─┬─< Trip
         └─< Shipment ──────────────┴─< Document
```

`Company` is the tenant root: trucks, drivers, customers and shipments all hang off it.
A `Shipment` is the customer order; a `Trip` is one execution of it by a specific
driver + truck. `Document` attaches to exactly one of truck / driver / shipment —
enforced by the `CK_Documents_SingleOwner` check constraint.

Delete rules: deleting a `Company` or `Customer` that still has records returns **409**.
Deleting a `Truck` cascades to its services and documents; deleting a `Shipment`
cascades to its trips. Deleting a truck still referenced by a trip returns **409**.
Enums are stored as text in Postgres and sent as strings over JSON.

## Endpoints

Every resource has the same five operations:

```
GET    /api/{resource}          list, paged + filtered
GET    /api/{resource}/{id}     single
POST   /api/{resource}          create -> 201
PUT    /api/{resource}/{id}     full update
DELETE /api/{resource}/{id}     -> 204
```

Resources: `companies`, `trucks`, `drivers`, `customers`, `shipments`, `trips`,
`truck-services`, `documents`.

Plus:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/dashboard?companyId=` | Fleet / driver / shipment counters, active trips, upcoming shipments, expiring documents |
| GET | `/api/trips/{id}/track` | Road geometry, distance, drive time, waypoints, the truck id and its fixes within the trip's window |
| GET/POST | `/api/shipments/{id}/stops` | Intermediate waypoints; `DELETE .../stops/{stopId}` removes one |
| GET | `/api/locations` | City reference data (name, country, lat/lon) — full CRUD |
| WS | `/hubs/trips` | SignalR hub; `JoinTruck(truckId)` subscribes to that truck's live positions |
| GET | `/api/dashboard/service-spend?companyId=&months=6` | Service cost per month, aggregated with `GROUP BY` in Postgres; months with no work come back as zero. `months` is clamped to 1–36 |
| PUT | `/api/drivers/{id}/truck` | Assign or unassign (`{"truckId": null}`) a driver's truck |
| POST | `/api/shipments/{id}/assign` | Assign driver + truck — creates the `Trip` and moves a Draft shipment to Scheduled |
| GET | `/api/shipments/{id}/trips` | Trips for one shipment |
| GET | `/health` | Verifies the database connection |
| GET | `/openapi/v1.json` | OpenAPI document (Development only) |

### List query parameters

All lists accept `page` (default 1) and `pageSize` (default 25, max 200) and return
`{ items, page, pageSize, total, totalPages }`.

| Resource | Filters |
| --- | --- |
| companies | `search` |
| trucks | `companyId`, `status`, `search` |
| drivers | `companyId`, `truckId`, `status`, `search` |
| customers | `companyId`, `isActive`, `search` |
| shipments | `companyId`, `customerId`, `status`, `search`, `pickupFrom`, `pickupTo` |
| trips | `shipmentId`, `driverId`, `truckId`, `status` |
| truck-services | `truckId`, `companyId`, `type`, `from`, `to` |
| documents | `ownerType`, `ownerId`, `type`, `expiresBefore` |

### Status codes

`400` validation error or a reference that does not exist (including cross-company
mismatches) · `404` unknown id · `409` unique-constraint or in-use conflict.
Errors come back as RFC 9457 Problem Details.

## Web UI

Pages: **Dashboard**, Trucks, Drivers, Customers, Shipments, Trips, Truck Services,
and Companies. Every list page has the same shape — search + filters, a sortable
table, a slide-out create/edit form, and a confirm dialog for deletes.

Clicking a row opens that record's **detail page** (`/trucks/:id`, `/drivers/:id`,
`/customers/:id`, `/shipments/:id`, `/trips/:id`, `/companies/:id`): a header card
with a metric strip, tabs over the related records, an activity feed derived from
those records, and a side rail with compliance dates and linked-record counts.
The shared building blocks live in
[web/src/components/detail/detail-shell.tsx](web/src/components/detail/detail-shell.tsx).

Everything except Companies is scoped to the company picked in the header
(remembered in `localStorage`), so create a company first. Shipments carry an extra
**assign** action that picks a driver + truck and creates the trip.

The dashboard shows stat tiles, fleet-status and shipment-pipeline bars, a
six-month service-spend trend, active trips, upcoming shipments and expiring
documents. Chart colours follow a fixed categorical order with the value printed on
each bar, so nothing is read by colour alone; dark mode uses its own colour steps
rather than an inverted palette.

Server errors surface as toasts — including the API's 409 when you delete a record
that is still referenced. All HTTP goes through one axios instance in
[web/src/lib/api.ts](web/src/lib/api.ts): a request interceptor drops empty filter
params, and a response interceptor turns every failure into a single `ApiError`
type carrying the RFC 9457 title, detail and per-field validation errors. List
queries pass TanStack Query's `AbortSignal`, so superseded requests are cancelled.

Search is debounced (300 ms) via [use-debounced-value.ts](web/src/hooks/use-debounced-value.ts),
so typing sends one request instead of one per keystroke; Enter skips the wait.

### Live tracking

A trip's **Live map** tab draws the planned route, the path covered so far and the
truck's current position on OpenStreetMap tiles (Leaflet). Positions arrive over
**SignalR** (`/hubs/trips`) — the initial track still comes from REST, so a dropped
socket degrades to stale data rather than a blank map.

Routes follow **real roads**. `RoutingService` asks OpenRouteService for the road
geometry through a shipment's waypoints (origin → stops → destination) and caches
the answer in `Routes`, keyed by the ordered location ids — so each distinct
sequence costs one provider call, ever. Add stops on the shipment detail page and
the key changes, which re-routes on the next load.

Set `ORS_API_KEY` in `.env` (free key from openrouteservice.org). **Without it
everything still works** — routes fall back to straight lines and the map says
`Routing: straight line` instead of `road`.

**Positions belong to trucks, not trips** (`TruckPositions`). Real telematics —
the truck's factory unit reporting over mobile to the maker's cloud, read through
an API such as ACEA's rFMS — sends fixes per vehicle around the clock and knows
nothing about our trips. A trip's track is therefore the slice of its truck's fixes
between `StartedAt` and `CompletedAt`, and progress along the route is *derived* by
projecting the newest fix onto the geometry rather than stored: a feed reports a
position, never a percentage. `Truck.ExternalId` holds the provider's vehicle id.

There is no telematics hardware yet, so `TripSimulator` stands in for it and
publishes the same shape a provider would (`Source = "simulator"`). It walks each
**In Progress** trip's truck along the road geometry by distance, so the speed
stays even, and stops writing once the truck arrives. Swapping in a real feed means
replacing that one service — the table, the hub and the map stay as they are. It is off unless `Simulation:Enabled` is
true (set in `appsettings.Development.json`, with `TickSeconds` and `RouteMinutes`).
Never enable it against real data.

**Sorting is client-side over the loaded page**, not the whole result set; paging
and filtering are server-side. Raise the page size (up to 200) to sort across more
rows.

## Project layout

```
api/
  Domain/         entities + enums
  Data/
    AppDbContext.cs
    Configurations/   one IEntityTypeConfiguration per entity
  Contracts/      request/response DTOs with validation attributes
  Services/       one interface + implementation per resource — all the logic
  Controllers/    thin HTTP layer, one per resource
  Common/         ServiceResult, paging and save-conflict helpers
  Migrations/
web/src/
  types/api.ts    TypeScript mirror of the API contracts
  lib/            axios instance + interceptors (problem-details aware), formatting
  hooks/          generic CRUD query hooks, company context, list state
  components/
    ui/           shadcn/ui primitives
    common/       data table, forms, charts, list shell
    layout/       app shell, company switcher, theme toggle
  pages/          one page per resource
```

### Request flow

```
Controller  → validates the DTO ([ApiController] does this automatically),
               calls the service, maps ServiceResult onto a status code
Service     → all the rules: reference checks, cross-company guards,
               status transitions. Knows nothing about HTTP.
AppDbContext → EF Core, which is already the repository + unit of work
```

Services return `ServiceResult` / `ServiceResult<T>` carrying `Success`,
`NotFound`, `Invalid` or `Conflict`. `ApiControllerBase` is the only place that
turns those into 200 / 404 / 400 / 409, so services stay testable without a web
host.

To add a resource: entity in `Domain/`, config in `Data/Configurations/`, a `DbSet`
in `AppDbContext`, DTOs in `Contracts/`, an `IFooService` + `FooService` in
`Services/`, a controller in `Controllers/`, then register the service in
[api/Program.cs](api/Program.cs) and add a migration. On the web side, add the
type to [web/src/types/api.ts](web/src/types/api.ts), a line in
[web/src/hooks/use-resources.ts](web/src/hooks/use-resources.ts), and a page modelled
on [web/src/pages/trucks.tsx](web/src/pages/trucks.tsx).

## Migrations

`api/Migrations/` holds `InitialCreate`, covering all eight tables. It is applied
automatically at startup when `Database:AutoMigrate` is true — set in
[api/appsettings.Development.json](api/appsettings.Development.json), so
`docker compose up` gives you a ready schema. Turn it off for production and apply
migrations as a deliberate step.

After changing an entity:

```bash
dotnet tool install --global dotnet-ef   # once
cd api
dotnet ef migrations add <Name>
dotnet ef database update
```

## Configuration

The API reads standard ASP.NET Core configuration. Compose overrides:

- `ConnectionStrings__Postgres` — Npgsql connection string
- `Cors__Origins__0`, `Cors__Origins__1` — allowed browser origins

The web build takes a `VITE_API_URL` build arg (defaults to `/api`). In dev, Vite
proxies `/api` to `VITE_PROXY_TARGET` (default `http://localhost:5272`). Both proxies
preserve the `/api` prefix — the API namespaces its own routes under it.
