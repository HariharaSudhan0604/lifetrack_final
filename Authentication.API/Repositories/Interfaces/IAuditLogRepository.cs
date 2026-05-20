using Authentication.API.Models;
namespace Authentication.API.Repositories.Interfaces;

public interface IAuditLogRepository
{
    Task AddAsync(AuditLog log);
    Task<(IReadOnlyList<AuditLog> Items, int TotalCount)> ListAsync(long? userId, int page, int pageSize);
}
