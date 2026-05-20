using AdverseEvent.API.Data;
using AdverseEvent.API.Models;
using AdverseEvent.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AdverseEvent.API.Repositories;

public class DeviationRepository : IDeviationRepository
{
    private readonly AdverseEventDbContext _db;

    public DeviationRepository(AdverseEventDbContext db) => _db = db;

    public Task<Deviation?> GetByIdAsync(long id)
        => _db.Deviations.FirstOrDefaultAsync(x => x.DeviationID == id);

    public async Task<(IReadOnlyList<Deviation> Items, int TotalCount)> ListAsync(
        long? siteProtocolId, string? severity, string? status, int page, int pageSize)
    {
        var q = _db.Deviations.AsQueryable();
        if (siteProtocolId.HasValue) q = q.Where(x => x.SiteProtocolID == siteProtocolId.Value);
        if (!string.IsNullOrEmpty(severity)) q = q.Where(x => x.Severity == severity);
        if (!string.IsNullOrEmpty(status)) q = q.Where(x => x.Status == status);
        q = q.OrderByDescending(x => x.DeviationID);
        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (items, total);
    }

    public async Task<Deviation> AddAsync(Deviation deviation)
    {
        _db.Deviations.Add(deviation);
        await _db.SaveChangesAsync();
        return deviation;
    }

    public async Task UpdateAsync(Deviation deviation)
    {
        _db.Deviations.Update(deviation);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(long id)
    {
        var d = await _db.Deviations.FindAsync(id);
        if (d != null)
        {
            _db.Deviations.Remove(d);
            await _db.SaveChangesAsync();
        }
    }
}
