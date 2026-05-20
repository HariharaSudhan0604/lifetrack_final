using Authentication.API.DTOs;
using Authentication.API.Models;
using Authentication.API.Repositories.Interfaces;
using Authentication.API.Services.Interfaces;
namespace Authentication.API.Services;

public class AuditLogService : IAuditLogService
{
    private readonly IAuditLogRepository _repo;
    public AuditLogService(IAuditLogRepository repo) => _repo = repo;

    public Task RecordAsync(long userId, string action)
    {
        var log = new AuditLog
        {
            UserID = userId,
            Action = action,
            ActionTime = DateTime.UtcNow
        };
        return _repo.AddAsync(log);
    }

    public async Task<PagedResult<AuditLogResponse>> ListAsync(long? userId, int page, int pageSize)
    {
        var (items, total) = await _repo.ListAsync(userId, page, pageSize);
        return new PagedResult<AuditLogResponse>
        {
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            Items = items.Select(l => new AuditLogResponse
            {
                AuditID = l.AuditID,
                UserID = l.UserID,
                UserName = l.User?.Name,
                Action = l.Action,
                ActionTime = l.ActionTime
            }).ToList()
        };
    }
}
