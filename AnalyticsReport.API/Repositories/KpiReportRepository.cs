using AnalyticsReport.API.Data;
using AnalyticsReport.API.Models;
using AnalyticsReport.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AnalyticsReport.API.Repositories;

public class KpiReportRepository : IKpiReportRepository
{
    private readonly AnalyticsDbContext _db;

    public KpiReportRepository(AnalyticsDbContext db) => _db = db;

    public Task<KpiReport?> GetByIdAsync(long id)
        => _db.KpiReports.FirstOrDefaultAsync(r => r.ReportID == id);

    public async Task<(IReadOnlyList<KpiReport> Items, int TotalCount)> ListAsync(
        string? scope, int page, int pageSize)
    {
        var q = _db.KpiReports.AsQueryable();
        if (!string.IsNullOrEmpty(scope)) q = q.Where(r => r.Scope == scope);
        q = q.OrderByDescending(r => r.GeneratedDate);
        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (items, total);
    }

    public async Task<KpiReport> AddAsync(KpiReport report)
    {
        if (report.GeneratedDate == default) report.GeneratedDate = DateTime.UtcNow;
        _db.KpiReports.Add(report);
        await _db.SaveChangesAsync();
        return report;
    }

    public async Task UpdateAsync(KpiReport report)
    {
        _db.KpiReports.Update(report);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(long id)
    {
        var r = await _db.KpiReports.FindAsync(id);
        if (r != null)
        {
            _db.KpiReports.Remove(r);
            await _db.SaveChangesAsync();
        }
    }
}
