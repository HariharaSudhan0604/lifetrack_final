using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProtocolSite.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditEntries",
                columns: table => new
                {
                    AuditEntryID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EntityName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PrimaryKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Action = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ChangedByUserID = table.Column<long>(type: "bigint", nullable: true),
                    ChangedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditEntries", x => x.AuditEntryID);
                });

            migrationBuilder.CreateTable(
                name: "Protocols",
                columns: table => new
                {
                    ProtocolID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Phase = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Protocols", x => x.ProtocolID);
                });

            migrationBuilder.CreateTable(
                name: "Sites",
                columns: table => new
                {
                    SiteID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Location = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sites", x => x.SiteID);
                });

            migrationBuilder.CreateTable(
                name: "SiteProtocols",
                columns: table => new
                {
                    SiteProtocolID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SiteID = table.Column<long>(type: "bigint", nullable: false),
                    ProtocolID = table.Column<long>(type: "bigint", nullable: false),
                    InvestigatorID = table.Column<long>(type: "bigint", nullable: true),
                    InitiationDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SiteProtocols", x => x.SiteProtocolID);
                    table.ForeignKey(
                        name: "FK_SiteProtocols_Protocols_ProtocolID",
                        column: x => x.ProtocolID,
                        principalTable: "Protocols",
                        principalColumn: "ProtocolID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SiteProtocols_Sites_SiteID",
                        column: x => x.SiteID,
                        principalTable: "Sites",
                        principalColumn: "SiteID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditEntries_ChangedAt",
                table: "AuditEntries",
                column: "ChangedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AuditEntries_EntityName",
                table: "AuditEntries",
                column: "EntityName");

            migrationBuilder.CreateIndex(
                name: "IX_Protocols_Phase",
                table: "Protocols",
                column: "Phase");

            migrationBuilder.CreateIndex(
                name: "IX_Protocols_Status",
                table: "Protocols",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SiteProtocols_InvestigatorID",
                table: "SiteProtocols",
                column: "InvestigatorID");

            migrationBuilder.CreateIndex(
                name: "IX_SiteProtocols_ProtocolID",
                table: "SiteProtocols",
                column: "ProtocolID");

            migrationBuilder.CreateIndex(
                name: "IX_SiteProtocols_SiteID",
                table: "SiteProtocols",
                column: "SiteID");

            migrationBuilder.CreateIndex(
                name: "IX_SiteProtocols_Status",
                table: "SiteProtocols",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Sites_Status",
                table: "Sites",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditEntries");

            migrationBuilder.DropTable(
                name: "SiteProtocols");

            migrationBuilder.DropTable(
                name: "Protocols");

            migrationBuilder.DropTable(
                name: "Sites");
        }
    }
}
