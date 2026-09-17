using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FleetManagement.Api.Migrations
{
    /// <inheritdoc />
    public partial class MoveToTruckPositions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TripPositions");

            migrationBuilder.AddColumn<string>(
                name: "ExternalId",
                table: "Trucks",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TruckPositions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TruckId = table.Column<Guid>(type: "uuid", nullable: false),
                    Latitude = table.Column<double>(type: "double precision", nullable: false),
                    Longitude = table.Column<double>(type: "double precision", nullable: false),
                    SpeedKmh = table.Column<double>(type: "double precision", nullable: true),
                    HeadingDeg = table.Column<double>(type: "double precision", nullable: true),
                    OdometerKm = table.Column<double>(type: "double precision", nullable: true),
                    Source = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    RecordedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TruckPositions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TruckPositions_Trucks_TruckId",
                        column: x => x.TruckId,
                        principalTable: "Trucks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TruckPositions_TruckId_RecordedAt",
                table: "TruckPositions",
                columns: new[] { "TruckId", "RecordedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TruckPositions_TruckId_RecordedAt_Source",
                table: "TruckPositions",
                columns: new[] { "TruckId", "RecordedAt", "Source" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TruckPositions");

            migrationBuilder.DropColumn(
                name: "ExternalId",
                table: "Trucks");

            migrationBuilder.CreateTable(
                name: "TripPositions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TripId = table.Column<Guid>(type: "uuid", nullable: false),
                    HeadingDeg = table.Column<double>(type: "double precision", nullable: true),
                    Latitude = table.Column<double>(type: "double precision", nullable: false),
                    Longitude = table.Column<double>(type: "double precision", nullable: false),
                    Progress = table.Column<double>(type: "double precision", nullable: true),
                    RecordedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    SpeedKmh = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TripPositions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TripPositions_Trips_TripId",
                        column: x => x.TripId,
                        principalTable: "Trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TripPositions_TripId_RecordedAt",
                table: "TripPositions",
                columns: new[] { "TripId", "RecordedAt" });
        }
    }
}
