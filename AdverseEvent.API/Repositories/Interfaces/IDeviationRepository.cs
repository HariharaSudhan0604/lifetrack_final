using AdverseEvent.API.Models;

namespace AdverseEvent.API.Repositories.Interfaces;

public interface IDeviationRepository
{
    Task<Deviation?> GetByIdAsync(long id);
    Task<(IReadOnlyList<Deviation> Items, int TotalCount)> ListAsync(
        long? siteProtocolId, string? severity, string? status, int page, int pageSize);
    Task<Deviation> AddAsync(Deviation deviation);
    Task UpdateAsync(Deviation deviation);
    Task DeleteAsync(long id);
}
