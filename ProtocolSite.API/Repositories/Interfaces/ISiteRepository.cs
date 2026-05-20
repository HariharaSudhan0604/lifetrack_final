using ProtocolSite.API.Models;
namespace ProtocolSite.API.Repositories.Interfaces;

public interface ISiteRepository
{
    Task<Site?> GetByIdAsync(long id);
    Task<(IReadOnlyList<Site> Items, int TotalCount)> ListAsync(string? status, string? search, int page, int pageSize);
    Task<Site> AddAsync(Site site);
    Task UpdateAsync(Site site);
    Task DeleteAsync(long id);
}
