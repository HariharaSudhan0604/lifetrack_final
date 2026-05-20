using Microsoft.EntityFrameworkCore;
using ProtocolSite.API.Data;
using ProtocolSite.API.Models;
using ProtocolSite.API.Repositories.Interfaces;
namespace ProtocolSite.API.Repositories;

public class SiteRepository : ISiteRepository
{
    private readonly ProtocolSiteDbContext _db;
    public SiteRepository(ProtocolSiteDbContext db) => _db = db;

    public Task<Site?> GetByIdAsync(long id) =>
        _db.Sites.FirstOrDefaultAsync(s => s.SiteID == id);

    public async Task<(IReadOnlyList<Site> Items, int TotalCount)> ListAsync(string? status, string? search, int page, int pageSize)
    {
        var q = _db.Sites.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(s => s.Status == status);
        if (!string.IsNullOrEmpty(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(x => x.Name.ToLower().Contains(s) || x.Location.ToLower().Contains(s));
        }
        var total = await q.CountAsync();
        var items = await q.OrderBy(s => s.Name).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (items, total);
    }

    public async Task<Site> AddAsync(Site site)
    { _db.Sites.Add(site); await _db.SaveChangesAsync(); return site; }

    public async Task UpdateAsync(Site site)
    { _db.Sites.Update(site); await _db.SaveChangesAsync(); }

    public async Task DeleteAsync(long id)
    {
        var s = await _db.Sites.FindAsync(id);
        if (s != null) { _db.Sites.Remove(s); await _db.SaveChangesAsync(); }
    }
}
