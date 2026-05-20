using Microsoft.EntityFrameworkCore;
using Notification.API.Data;
using Notification.API.Models;
using Notification.API.Repositories.Interfaces;

namespace Notification.API.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly NotificationDbContext _db;

    public NotificationRepository(NotificationDbContext db) => _db = db;

    public Task<NotificationRecord?> GetByIdAsync(long id)
        => _db.Notifications.FirstOrDefaultAsync(n => n.NotificationID == id);

    public async Task<(IReadOnlyList<NotificationRecord> Items, int TotalCount)> ListForUserAsync(
        long userId, string? status, string? category, int page, int pageSize)
    {
        var q = _db.Notifications.Where(n => n.UserID == userId);
        if (!string.IsNullOrEmpty(status)) q = q.Where(n => n.Status == status);
        if (!string.IsNullOrEmpty(category)) q = q.Where(n => n.Category == category);
        q = q.OrderByDescending(n => n.CreatedDate);
        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (items, total);
    }

    public async Task<(IReadOnlyList<NotificationRecord> Items, int TotalCount)> ListAllAsync(
        string? category, string? status, int page, int pageSize)
    {
        var q = _db.Notifications.AsQueryable();
        if (!string.IsNullOrEmpty(category)) q = q.Where(n => n.Category == category);
        if (!string.IsNullOrEmpty(status)) q = q.Where(n => n.Status == status);
        q = q.OrderByDescending(n => n.CreatedDate);
        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (items, total);
    }

    public async Task<NotificationRecord> AddAsync(NotificationRecord notification)
    {
        if (notification.CreatedDate == default) notification.CreatedDate = DateTime.UtcNow;
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();
        return notification;
    }

    public async Task UpdateAsync(NotificationRecord notification)
    {
        _db.Notifications.Update(notification);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(long id)
    {
        var n = await _db.Notifications.FindAsync(id);
        if (n != null)
        {
            _db.Notifications.Remove(n);
            await _db.SaveChangesAsync();
        }
    }
}
