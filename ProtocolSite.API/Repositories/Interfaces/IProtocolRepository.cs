using ProtocolSite.API.Models;
namespace ProtocolSite.API.Repositories.Interfaces;

public interface IProtocolRepository
{
    Task<Protocol?> GetByIdAsync(long id);
    Task<(IReadOnlyList<Protocol> Items, int TotalCount)> ListAsync(string? status, string? phase, string? search, int page, int pageSize);
    Task<Protocol> AddAsync(Protocol protocol);
    Task UpdateAsync(Protocol protocol);
    Task DeleteAsync(long id);
}
