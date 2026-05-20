using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace Notification.API.Models;

[Table("Notifications")]
public class NotificationRecord
{
    [Key] public long NotificationID { get; set; }
    [Required] public long UserID { get; set; }
    [Required, MaxLength(1000)] public string Message { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Category { get; set; } = "Visit";
    [Required, MaxLength(20)] public string Status { get; set; } = "Unread";
    [Required] public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
}
