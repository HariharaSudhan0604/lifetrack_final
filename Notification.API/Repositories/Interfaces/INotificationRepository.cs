using Notification.API.Models;

namespace Notification.API.Repositories.Interfaces;

public interface INotificationRepository
{
    Task<NotificationRecord?> GetByIdAsync(long id);
    Task<(IReadOnlyList<NotificationRecord> Items, int TotalCount)> ListForUserAsync(
        long userId, string? status, string? category, int page, int pageSize);
    Task<(IReadOnlyList<NotificationRecord> Items, int TotalCount)> ListAllAsync(
        string? category, string? status, int page, int pageSize);
    Task<NotificationRecord> AddAsync(NotificationRecord notification);
    Task UpdateAsync(NotificationRecord notification);
    Task DeleteAsync(long id);
}
