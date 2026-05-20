using ProtocolSite.API.Models;
namespace ProtocolSite.API.Repositories.Interfaces;

public interface ISiteProtocolRepository
{
    Task<SiteProtocol?> GetByIdAsync(long id);
    Task<(IReadOnlyList<SiteProtocol> Items, int TotalCount)> ListAsync(long? siteId, long? protocolId, long? investigatorId, string? status, int page, int pageSize);
    Task<SiteProtocol> AddAsync(SiteProtocol siteProtocol);
    Task UpdateAsync(SiteProtocol siteProtocol);
    Task DeleteAsync(long id);
}
