using AnalyticsReport.API.Models;

namespace AnalyticsReport.API.Repositories.Interfaces;

public interface IKpiReportRepository
{
    Task<KpiReport?> GetByIdAsync(long id);
    Task<(IReadOnlyList<KpiReport> Items, int TotalCount)> ListAsync(string? scope, string? status, int page, int pageSize);
    Task<KpiReport> AddAsync(KpiReport report);
    Task UpdateAsync(KpiReport report);
    Task DeleteAsync(long id);
}
