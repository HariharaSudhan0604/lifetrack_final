using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocumentCompliance.API.Migrations
{
    /// <inheritdoc />
    public partial class FixPendingChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Type",
                table: "Documents",
                newName: "Category");

            migrationBuilder.AlterColumn<long>(
                name: "ProtocolID",
                table: "Documents",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Documents",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "Documents",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Documents_Category",
                table: "Documents",
                column: "Category");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Documents_Category",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "Documents");

            migrationBuilder.RenameColumn(
                name: "Category",
                table: "Documents",
                newName: "Type");

            migrationBuilder.AlterColumn<long>(
                name: "ProtocolID",
                table: "Documents",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);
        }
    }
}
