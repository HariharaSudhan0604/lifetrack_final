using Microsoft.EntityFrameworkCore;
using ProtocolSite.API.Data;
using ProtocolSite.API.Models;
using ProtocolSite.API.Repositories.Interfaces;
namespace ProtocolSite.API.Repositories;

public class ProtocolRepository : IProtocolRepository
{
    private readonly ProtocolSiteDbContext _db;
    public ProtocolRepository(ProtocolSiteDbContext db) => _db = db;

    public Task<Protocol?> GetByIdAsync(long id) =>
        _db.Protocols.FirstOrDefaultAsync(p => p.ProtocolID == id);

    public async Task<(IReadOnlyList<Protocol> Items, int TotalCount)> ListAsync(string? status, string? search, int page, int pageSize)
    {
        var q = _db.Protocols.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(p => p.Status == status);
        if (!string.IsNullOrEmpty(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(p => p.Title.ToLower().Contains(s));
        }
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(p => p.StartDate).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (items, total);
    }

    public async Task<Protocol> AddAsync(Protocol protocol)
    { _db.Protocols.Add(protocol); await _db.SaveChangesAsync(); return protocol; }

    public async Task UpdateAsync(Protocol protocol)
    { _db.Protocols.Update(protocol); await _db.SaveChangesAsync(); }

    public async Task DeleteAsync(long id)
    {
        var p = await _db.Protocols.FindAsync(id);
        if (p != null) { _db.Protocols.Remove(p); await _db.SaveChangesAsync(); }
    }
}
