using Authentication.API.Models;
using Microsoft.EntityFrameworkCore;
namespace Authentication.API.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AuthDbContext db)
    {
        if (!await db.Roles.AnyAsync())
        {
            db.Roles.AddRange(
                new Role { RoleID = 1, RoleName = "Admin" },
                new Role { RoleID = 2, RoleName = "ClinicalTrialManager" },
                new Role { RoleID = 3, RoleName = "Investigator" },
                new Role { RoleID = 4, RoleName = "Patient" },
                new Role { RoleID = 5, RoleName = "RegulatoryOfficer" },
                new Role { RoleID = 6, RoleName = "DataManager" }
            );
            await db.SaveChangesAsync();
        }
        if (!await db.Users.AnyAsync(u => u.Email == "admin@lifetrack.com"))
        {
            db.Users.Add(new User
            {
                Name = "Super Admin",
                Email = "admin@lifetrack.com",
                RoleID = 1,
                Phone = "9999999999",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@1234", workFactor: 12),
                IsActive = true
            });
            await db.SaveChangesAsync();
        }
    }
}
