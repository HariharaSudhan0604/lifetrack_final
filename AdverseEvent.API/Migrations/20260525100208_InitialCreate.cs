using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AdverseEvent.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AdverseEvents",
                columns: table => new
                {
                    EventID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PatientID = table.Column<long>(type: "bigint", nullable: false),
                    ProtocolID = table.Column<long>(type: "bigint", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ReportedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdverseEvents", x => x.EventID);
                });

            migrationBuilder.CreateTable(
                name: "Deviations",
                columns: table => new
                {
                    DeviationID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SiteProtocolID = table.Column<long>(type: "bigint", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Deviations", x => x.DeviationID);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AdverseEvents_PatientID",
                table: "AdverseEvents",
                column: "PatientID");

            migrationBuilder.CreateIndex(
                name: "IX_AdverseEvents_ProtocolID",
                table: "AdverseEvents",
                column: "ProtocolID");

            migrationBuilder.CreateIndex(
                name: "IX_AdverseEvents_ReportedDate",
                table: "AdverseEvents",
                column: "ReportedDate");

            migrationBuilder.CreateIndex(
                name: "IX_AdverseEvents_Severity",
                table: "AdverseEvents",
                column: "Severity");

            migrationBuilder.CreateIndex(
                name: "IX_AdverseEvents_Status",
                table: "AdverseEvents",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Deviations_SiteProtocolID",
                table: "Deviations",
                column: "SiteProtocolID");

            migrationBuilder.CreateIndex(
                name: "IX_Deviations_Status",
                table: "Deviations",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AdverseEvents");

            migrationBuilder.DropTable(
                name: "Deviations");
        }
    }
}
