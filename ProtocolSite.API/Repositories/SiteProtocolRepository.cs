using Microsoft.EntityFrameworkCore;
using ProtocolSite.API.Data;
using ProtocolSite.API.Models;
using ProtocolSite.API.Repositories.Interfaces;
namespace ProtocolSite.API.Repositories;

public class SiteProtocolRepository : ISiteProtocolRepository
{
    private readonly ProtocolSiteDbContext _db;
    public SiteProtocolRepository(ProtocolSiteDbContext db) => _db = db;

    public Task<SiteProtocol?> GetByIdAsync(long id) =>
        _db.SiteProtocols.Include(sp => sp.Site).Include(sp => sp.Protocol).FirstOrDefaultAsync(sp => sp.SiteProtocolID == id);

    public async Task<(IReadOnlyList<SiteProtocol> Items, int TotalCount)> ListAsync(
        long? siteId, long? protocolId, long? investigatorId, string? status, int page, int pageSize)
    {
        var q = _db.SiteProtocols.AsNoTracking().AsQueryable();
        if (siteId.HasValue) q = q.Where(sp => sp.SiteID == siteId.Value);
        if (protocolId.HasValue) q = q.Where(sp => sp.ProtocolID == protocolId.Value);
        if (investigatorId.HasValue) q = q.Where(sp => sp.InvestigatorID == investigatorId.Value);
        if (!string.IsNullOrEmpty(status)) q = q.Where(sp => sp.Status == status);
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(sp => sp.SiteProtocolID).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (items, total);
    }

    public async Task<SiteProtocol> AddAsync(SiteProtocol sp)
    { _db.SiteProtocols.Add(sp); await _db.SaveChangesAsync(); return sp; }

    public async Task UpdateAsync(SiteProtocol sp)
    { _db.SiteProtocols.Update(sp); await _db.SaveChangesAsync(); }

    public async Task DeleteAsync(long id)
    {
        var sp = await _db.SiteProtocols.FindAsync(id);
        if (sp != null) { _db.SiteProtocols.Remove(sp); await _db.SaveChangesAsync(); }
    }
}
