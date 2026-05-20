using Authentication.API.Models;
namespace Authentication.API.Repositories.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(long userId);
    Task<User?> GetByEmailAsync(string email);
    Task<bool> EmailExistsAsync(string email);
    Task<(IReadOnlyList<User> Items, int TotalCount)> ListAsync(int page, int pageSize, string? search = null);
    Task<User> AddAsync(User user);
    Task UpdateAsync(User user);
    Task SoftDeleteAsync(long userId);
    Task ReactivateAsync(long userId);
}
