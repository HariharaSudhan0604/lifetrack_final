using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnalyticsReport.API.Migrations
{
    /// <inheritdoc />
    public partial class AddKpiFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(name: "VisitComplianceRate",  table: "KPIReports", type: "float", nullable: false, defaultValue: 0.0);
            migrationBuilder.AddColumn<double>(name: "PatientRetentionRate", table: "KPIReports", type: "float", nullable: false, defaultValue: 0.0);
            migrationBuilder.AddColumn<int>(name: "TotalProtocols",    table: "KPIReports", type: "int", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<int>(name: "TotalPatients",     table: "KPIReports", type: "int", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<int>(name: "TotalEnrollments",  table: "KPIReports", type: "int", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<int>(name: "ActiveEnrollments", table: "KPIReports", type: "int", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<int>(name: "TotalVisits",       table: "KPIReports", type: "int", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<int>(name: "MildAEs",           table: "KPIReports", type: "int", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<int>(name: "ModerateAEs",       table: "KPIReports", type: "int", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<int>(name: "SevereAEs",         table: "KPIReports", type: "int", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<int>(name: "DevCount",          table: "KPIReports", type: "int", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<int>(name: "ReportedDevs",      table: "KPIReports", type: "int", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<int>(name: "ResolvedDevs",      table: "KPIReports", type: "int", nullable: false, defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "VisitComplianceRate",  table: "KPIReports");
            migrationBuilder.DropColumn(name: "PatientRetentionRate", table: "KPIReports");
            migrationBuilder.DropColumn(name: "TotalProtocols",    table: "KPIReports");
            migrationBuilder.DropColumn(name: "TotalPatients",     table: "KPIReports");
            migrationBuilder.DropColumn(name: "TotalEnrollments",  table: "KPIReports");
            migrationBuilder.DropColumn(name: "ActiveEnrollments", table: "KPIReports");
            migrationBuilder.DropColumn(name: "TotalVisits",       table: "KPIReports");
            migrationBuilder.DropColumn(name: "MildAEs",           table: "KPIReports");
            migrationBuilder.DropColumn(name: "ModerateAEs",       table: "KPIReports");
            migrationBuilder.DropColumn(name: "SevereAEs",         table: "KPIReports");
            migrationBuilder.DropColumn(name: "DevCount",          table: "KPIReports");
            migrationBuilder.DropColumn(name: "ReportedDevs",      table: "KPIReports");
            migrationBuilder.DropColumn(name: "ResolvedDevs",      table: "KPIReports");
        }
    }
}
