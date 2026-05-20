using Authentication.API.Data;
using Authentication.API.Models;
using Authentication.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
namespace Authentication.API.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AuthDbContext _db;
    public UserRepository(AuthDbContext db) => _db = db;

    public Task<User?> GetByIdAsync(long userId) =>
        _db.Users.Include(u => u.RoleNavigation).FirstOrDefaultAsync(u => u.UserID == userId);

    public Task<User?> GetByEmailAsync(string email) =>
        _db.Users.Include(u => u.RoleNavigation).FirstOrDefaultAsync(u => u.Email == email);

    public Task<bool> EmailExistsAsync(string email) =>
        _db.Users.AnyAsync(u => u.Email == email);

    public async Task<(IReadOnlyList<User> Items, int TotalCount)> ListAsync(int page, int pageSize, string? search = null)
    {
        var query = _db.Users
            .Include(u => u.RoleNavigation)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u =>
                u.Name.ToLower().Contains(s) ||
                u.Email.ToLower().Contains(s) ||
                (u.RoleNavigation != null && u.RoleNavigation.RoleName.ToLower().Contains(s)));
        }

        query = query.OrderBy(u => u.Name);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<User> AddAsync(User user)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    public async Task UpdateAsync(User user)
    {
        _db.Users.Update(user);
        await _db.SaveChangesAsync();
    }

    public async Task SoftDeleteAsync(long userId)
    {
        var u = await _db.Users.FindAsync(userId);
        if (u != null) { u.IsActive = false; await _db.SaveChangesAsync(); }
    }

    public async Task ReactivateAsync(long userId)
    {
        var u = await _db.Users.FindAsync(userId);
        if (u != null) { u.IsActive = true; await _db.SaveChangesAsync(); }
    }
}
