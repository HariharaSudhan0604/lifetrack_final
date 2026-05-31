using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnalyticsReport.API.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "KPIReports",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Draft");

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "KPIReports",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Status",     table: "KPIReports");
            migrationBuilder.DropColumn(name: "ReviewedAt", table: "KPIReports");
        }
    }
}
