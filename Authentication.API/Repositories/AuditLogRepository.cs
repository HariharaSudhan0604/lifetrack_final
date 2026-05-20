using Authentication.API.Data;
using Authentication.API.Models;
using Authentication.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
namespace Authentication.API.Repositories;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly AuthDbContext _db;
    public AuditLogRepository(AuthDbContext db) => _db = db;

    public async Task AddAsync(AuditLog log)
    {
        _db.AuditLogs.Add(log);
        await _db.SaveChangesAsync();
    }

    public async Task<(IReadOnlyList<AuditLog> Items, int TotalCount)> ListAsync(long? userId, int page, int pageSize)
    {
        var query = _db.AuditLogs
            .Include(a => a.User)
            .AsNoTracking()
            .AsQueryable();

        if (userId.HasValue)
            query = query.Where(a => a.UserID == userId.Value);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.ActionTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }
}
