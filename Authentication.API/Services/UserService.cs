using Authentication.API.DTOs;
using Authentication.API.Models;
using Authentication.API.Repositories.Interfaces;
using Authentication.API.Services.Interfaces;
using Microsoft.Extensions.Caching.Memory;
namespace Authentication.API.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _users;
    private readonly IAuditLogService _audit;
    private readonly IPasswordHasher _hasher;
    private readonly IMemoryCache _cache;

    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    // Cache key constants
    private const string ListVersionKey = "users:list:version";
    private const string ListKeyPrefix = "users:list";
    private const string ItemKeyPrefix = "users:item";

    public UserService(IUserRepository users, IAuditLogService audit, IPasswordHasher hasher, IMemoryCache cache)
    { _users = users; _audit = audit; _hasher = hasher; _cache = cache; }

    // ── Queries ───────────────────────────────────────────────────────────────

    public async Task<PagedResult<UserResponse>> ListAsync(int page, int pageSize, string? search = null)
    {
        var version = GetListVersion();
        var cacheKey = $"{ListKeyPrefix}:v{version}:{page}:{pageSize}:{search ?? ""}";

        if (_cache.TryGetValue(cacheKey, out PagedResult<UserResponse>? cached) && cached is not null)
            return cached;

        var (items, total) = await _users.ListAsync(page, pageSize, search);
        var result = new PagedResult<UserResponse>
        {
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            Items = items.Select(Map).ToList()
        };

        _cache.Set(cacheKey, result, CacheDuration);
        return result;
    }

    public async Task<UserResponse?> GetAsync(long userId)
    {
        var cacheKey = $"{ItemKeyPrefix}:{userId}";
        if (_cache.TryGetValue(cacheKey, out UserResponse? cached) && cached is not null)
            return cached;

        var u = await _users.GetByIdAsync(userId);
        if (u is null) return null;

        var response = Map(u);
        _cache.Set(cacheKey, response, CacheDuration);
        return response;
    }

    // ── Commands ──────────────────────────────────────────────────────────────

    public async Task<UserResponse?> UpdateAsync(long userId, UpdateUserRequest req, long actingUserId)
    {
        var user = await _users.GetByIdAsync(userId);
        if (user is null) return null;
        if (userId == 1)
        {
            await _audit.RecordAsync(actingUserId, $"BLOCKED_SUPERADMIN_UPDATE_ATTEMPT:{userId}");
            throw new InvalidOperationException("The Super Admin account cannot be modified.");
        }
        user.Name = req.Name.Trim(); user.RoleID = req.RoleID; user.Phone = req.Phone;
        await _users.UpdateAsync(user);
        var loaded = await _users.GetByIdAsync(userId) ?? user;
        await _audit.RecordAsync(actingUserId, $"USER_UPDATED:{userId}");
        InvalidateUserCache(userId);
        return Map(loaded);
    }

    public async Task<bool> DeleteAsync(long userId, long actingUserId)
    {
        var u = await _users.GetByIdAsync(userId);
        if (u is null) return false;
        if (userId == 1)
        {
            await _audit.RecordAsync(actingUserId, $"BLOCKED_SUPERADMIN_DELETE_ATTEMPT:{userId}");
            throw new InvalidOperationException("The Super Admin account cannot be deleted or deactivated.");
        }
        await _users.SoftDeleteAsync(userId);
        await _audit.RecordAsync(actingUserId, $"USER_DELETED:{userId}");
        InvalidateUserCache(userId);
        return true;
    }

    public void InvalidateListCache() => BumpListVersion();

    public async Task<UserResponse?> ReactivateAsync(long userId, long actingUserId)
    {
        var u = await _users.GetByIdAsync(userId);
        if (u is null) return null;
        await _users.ReactivateAsync(userId);
        var loaded = await _users.GetByIdAsync(userId) ?? u;
        await _audit.RecordAsync(actingUserId, $"USER_REACTIVATED:{userId}");
        InvalidateUserCache(userId);
        return Map(loaded);
    }

    // ── Cache helpers ─────────────────────────────────────────────────────────

    /// <summary>
    /// Returns the current list-cache version number.
    /// All list cache keys embed this version, so bumping it naturally orphans old entries.
    /// </summary>
    private int GetListVersion() =>
        _cache.GetOrCreate(ListVersionKey, e =>
        {
            e.Priority = CacheItemPriority.NeverRemove;
            return 0;
        });

    /// <summary>
    /// Increment the version — old versioned list keys become unreachable and expire naturally.
    /// </summary>
    private void BumpListVersion()
    {
        var next = GetListVersion() + 1;
        _cache.Set(ListVersionKey, next, new MemoryCacheEntryOptions
        {
            Priority = CacheItemPriority.NeverRemove
        });
    }

    /// <summary>
    /// Evicts the single-user cache entry and bumps the list version.
    /// </summary>
    private void InvalidateUserCache(long userId)
    {
        _cache.Remove($"{ItemKeyPrefix}:{userId}");
        BumpListVersion();
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static string GetRoleName(int id) => id switch
    {
        1 => "Admin",
        2 => "ClinicalTrialManager",
        3 => "Investigator",
        4 => "Patient",
        5 => "RegulatoryOfficer",
        6 => "DataManager",
        _ => "Unknown"
    };

    private static UserResponse Map(User u) => new()
    {
        UserID   = u.UserID,
        Name     = u.Name,
        Email    = u.Email,
        RoleID   = u.RoleID,
        Role     = u.RoleNavigation?.RoleName ?? GetRoleName(u.RoleID),
        Phone    = u.Phone,
        IsActive = u.IsActive
    };
}
