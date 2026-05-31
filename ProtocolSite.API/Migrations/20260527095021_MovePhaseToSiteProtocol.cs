using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProtocolSite.API.Migrations
{
    /// <inheritdoc />
    public partial class MovePhaseToSiteProtocol : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Protocols_Phase",
                table: "Protocols");

            migrationBuilder.DropColumn(
                name: "Phase",
                table: "Protocols");

            migrationBuilder.AddColumn<string>(
                name: "Phase",
                table: "SiteProtocols",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_SiteProtocols_Phase",
                table: "SiteProtocols",
                column: "Phase");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SiteProtocols_Phase",
                table: "SiteProtocols");

            migrationBuilder.DropColumn(
                name: "Phase",
                table: "SiteProtocols");

            migrationBuilder.AddColumn<string>(
                name: "Phase",
                table: "Protocols",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Protocols_Phase",
                table: "Protocols",
                column: "Phase");
        }
    }
}
