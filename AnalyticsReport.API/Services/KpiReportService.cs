using AnalyticsReport.API.DTOs;
using AnalyticsReport.API.Models;
using AnalyticsReport.API.Repositories.Interfaces;
using AnalyticsReport.API.Services.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace AnalyticsReport.API.Services;

public class KpiReportService : IKpiReportService
{
    private readonly IKpiReportRepository _repo;
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);
    private const string VersionKey = "kpi:list:version";
    private const string ItemPrefix = "kpi:item";

    public KpiReportService(IKpiReportRepository repo, IMemoryCache cache)
    {
        _repo = repo;
        _cache = cache;
    }

    public async Task<PagedResult<KpiReportResponse>> ListAsync(string? scope, string? status, int page, int pageSize)
    {
        var v = GetVersion();
        var key = $"kpi:list:v{v}:{scope}:{status}:{page}:{pageSize}";
        if (_cache.TryGetValue(key, out PagedResult<KpiReportResponse>? cached) && cached is not null)
            return cached;
        var (items, total) = await _repo.ListAsync(scope, status, page, pageSize);
        var result = new PagedResult<KpiReportResponse>
        {
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            Items = items.Select(ToResponse).ToList()
        };
        _cache.Set(key, result, CacheDuration);
        return result;
    }

    public async Task<KpiReportResponse?> GetAsync(long id)
    {
        var key = $"{ItemPrefix}:{id}";
        if (_cache.TryGetValue(key, out KpiReportResponse? cached) && cached is not null)
            return cached;
        var r = await _repo.GetByIdAsync(id);
        if (r is null) return null;
        var response = ToResponse(r);
        _cache.Set(key, response, CacheDuration);
        return response;
    }

    public async Task<KpiReportResponse> CreateAsync(CreateKpiReportRequest req)
    {
        var report = new KpiReport
        {
            Scope               = req.Scope,
            EnrollmentRate      = req.EnrollmentRate,
            DropoutRate         = req.DropoutRate,
            VisitComplianceRate = req.VisitComplianceRate,
            PatientRetentionRate= req.PatientRetentionRate,
            TotalProtocols      = req.TotalProtocols,
            TotalPatients       = req.TotalPatients,
            TotalEnrollments    = req.TotalEnrollments,
            ActiveEnrollments   = req.ActiveEnrollments,
            TotalVisits         = req.TotalVisits,
            AECount             = req.AECount,
            MildAEs             = req.MildAEs,
            ModerateAEs         = req.ModerateAEs,
            SevereAEs           = req.SevereAEs,
            DevCount            = req.DevCount,
            ReportedDevs        = req.ReportedDevs,
            ResolvedDevs        = req.ResolvedDevs,
            GeneratedDate       = req.GeneratedDate ?? DateTime.UtcNow,
            StartDate           = req.StartDate,
            EndDate             = req.EndDate
        };
        var created = await _repo.AddAsync(report);
        BumpVersion();
        return ToResponse(created);
    }

    private int GetVersion() =>
        _cache.GetOrCreate(VersionKey, e => { e.Priority = CacheItemPriority.NeverRemove; return 0; });

    private void BumpVersion() =>
        _cache.Set(VersionKey, GetVersion() + 1, new MemoryCacheEntryOptions { Priority = CacheItemPriority.NeverRemove });

    public async Task<KpiReportResponse?> ReviewAsync(long id)
    {
        var report = await _repo.GetByIdAsync(id);
        if (report is null) return null;
        report.Status     = "Reviewed";
        report.ReviewedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(report);
        BumpVersion();
        return ToResponse(report);
    }

    private static KpiReportResponse ToResponse(KpiReport r) => new(
        r.ReportID, r.Scope,
        r.EnrollmentRate, r.DropoutRate, r.VisitComplianceRate, r.PatientRetentionRate,
        r.TotalProtocols, r.TotalPatients, r.TotalEnrollments, r.ActiveEnrollments, r.TotalVisits,
        r.AECount, r.MildAEs, r.ModerateAEs, r.SevereAEs,
        r.DevCount, r.ReportedDevs, r.ResolvedDevs,
        r.GeneratedDate, r.Status, r.ReviewedAt,
        r.StartDate, r.EndDate);
}
