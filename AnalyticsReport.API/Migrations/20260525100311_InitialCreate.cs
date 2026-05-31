using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnalyticsReport.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "KPIReports",
                columns: table => new
                {
                    ReportID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Scope = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EnrollmentRate = table.Column<double>(type: "float", nullable: false),
                    DropoutRate = table.Column<double>(type: "float", nullable: false),
                    AECount = table.Column<int>(type: "int", nullable: false),
                    GeneratedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KPIReports", x => x.ReportID);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KPIReports_GeneratedDate",
                table: "KPIReports",
                column: "GeneratedDate");

            migrationBuilder.CreateIndex(
                name: "IX_KPIReports_Scope",
                table: "KPIReports",
                column: "Scope");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "KPIReports");
        }
    }
}
