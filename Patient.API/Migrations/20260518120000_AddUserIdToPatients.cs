using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Patient.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIdToPatients : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "UserID",
                table: "Patients",
                type: "bigint",
                nullable: true);

            // Unique filtered index — each Auth user can have at most one Patient record.
            migrationBuilder.CreateIndex(
                name: "IX_Patients_UserID",
                table: "Patients",
                column: "UserID",
                unique: true,
                filter: "[UserID] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_UserID",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "UserID",
                table: "Patients");
        }
    }
}
