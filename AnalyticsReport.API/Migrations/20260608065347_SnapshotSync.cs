using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnalyticsReport.API.Migrations
{
    public partial class SnapshotSync : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // All columns already exist in DB - no SQL needed
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}