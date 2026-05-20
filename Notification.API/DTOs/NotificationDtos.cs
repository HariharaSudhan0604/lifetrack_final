using System.ComponentModel.DataAnnotations;
namespace Notification.API.DTOs;

public record CreateNotificationRequest(
    [Required] long UserID,
    [Required, MaxLength(1000)] string Message,
    [Required, MaxLength(50)] string Category
);
public record NotificationResponse(
    long NotificationID,
    long UserID,
    string Message,
    string Category,
    string Status,
    DateTime CreatedDate
);
