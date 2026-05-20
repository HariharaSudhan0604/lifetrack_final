using Authentication.API.DTOs;
namespace Authentication.API.Services.Interfaces;

public interface IAuditLogService
{
    Task RecordAsync(long userId, string action);
    Task<PagedResult<AuditLogResponse>> ListAsync(long? userId, int page, int pageSize);
}
