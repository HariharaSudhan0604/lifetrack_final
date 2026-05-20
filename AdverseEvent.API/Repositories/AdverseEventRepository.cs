using AdverseEvent.API.Data;
using AdverseEvent.API.Models;
using AdverseEvent.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AdverseEvent.API.Repositories;

public class AdverseEventRepository : IAdverseEventRepository
{
    private readonly AdverseEventDbContext _db;

    public AdverseEventRepository(AdverseEventDbContext db) => _db = db;

    public Task<AdverseEventRecord?> GetByIdAsync(long id)
        => _db.AdverseEvents.FirstOrDefaultAsync(x => x.EventID == id);

    public async Task<(IReadOnlyList<AdverseEventRecord> Items, int TotalCount)> ListAsync(
        long? protocolId, long? patientId, string? severity, string? status, int page, int pageSize)
    {
        var q = _db.AdverseEvents.AsQueryable();
        if (protocolId.HasValue) q = q.Where(x => x.ProtocolID == protocolId.Value);
        if (patientId.HasValue) q = q.Where(x => x.PatientID == patientId.Value);
        if (!string.IsNullOrEmpty(severity)) q = q.Where(x => x.Severity == severity);
        if (!string.IsNullOrEmpty(status)) q = q.Where(x => x.Status == status);
        q = q.OrderByDescending(x => x.ReportedDate);
        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (items, total);
    }

    public async Task<AdverseEventRecord> AddAsync(AdverseEventRecord ae)
    {
        _db.AdverseEvents.Add(ae);
        await _db.SaveChangesAsync();
        return ae;
    }

    public async Task UpdateAsync(AdverseEventRecord ae)
    {
        _db.AdverseEvents.Update(ae);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(long id)
    {
        var ae = await _db.AdverseEvents.FindAsync(id);
        if (ae != null)
        {
            _db.AdverseEvents.Remove(ae);
            await _db.SaveChangesAsync();
        }
    }
}
