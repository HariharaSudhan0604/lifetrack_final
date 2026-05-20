using Notification.API.DTOs;

namespace Notification.API.Services.Interfaces;

public interface INotificationService
{
    Task<PagedResult<NotificationResponse>> ListForUserAsync(
        long userId, string? status, string? category, int page, int pageSize);
    Task<PagedResult<NotificationResponse>> ListAllAsync(
        string? category, string? status, int page, int pageSize);
    Task<NotificationResponse> CreateAsync(CreateNotificationRequest req);
    Task<NotificationResponse?> MarkReadAsync(long id);
}
