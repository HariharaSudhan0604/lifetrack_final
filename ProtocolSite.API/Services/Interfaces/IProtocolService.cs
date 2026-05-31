using ProtocolSite.API.DTOs;
namespace ProtocolSite.API.Services.Interfaces;

public interface IProtocolService
{
    Task<ProtocolResponse?> GetAsync(long id);
    Task<PagedResult<ProtocolResponse>> ListAsync(string? status, string? search, int page, int pageSize);
    Task<ProtocolResponse> CreateAsync(CreateProtocolRequest req);
    Task<ProtocolResponse?> UpdateAsync(long id, UpdateProtocolRequest req);
    Task<bool> DeleteAsync(long id);
}
