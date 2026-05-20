using AdverseEvent.API.Models;

namespace AdverseEvent.API.Repositories.Interfaces;

public interface IAdverseEventRepository
{
    Task<AdverseEventRecord?> GetByIdAsync(long id);
    Task<(IReadOnlyList<AdverseEventRecord> Items, int TotalCount)> ListAsync(
        long? protocolId, long? patientId, string? severity, string? status, int page, int pageSize);
    Task<AdverseEventRecord> AddAsync(AdverseEventRecord ae);
    Task UpdateAsync(AdverseEventRecord ae);
    Task DeleteAsync(long id);
}
