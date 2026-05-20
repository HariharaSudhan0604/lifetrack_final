using Authentication.API.DTOs;
namespace Authentication.API.Services.Interfaces;

public interface IUserService
{
    Task<PagedResult<UserResponse>> ListAsync(int page, int pageSize, string? search = null);
    Task<UserResponse?> GetAsync(long userId);
    Task<UserResponse?> UpdateAsync(long userId, UpdateUserRequest req, long actingUserId);
    Task<bool> DeleteAsync(long userId, long actingUserId);
    Task<UserResponse?> ReactivateAsync(long userId, long actingUserId);
    void InvalidateListCache();
}
