using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace Authentication.API.Models;

[Table("AuditLogs")]
public class AuditLog
{
    [Key] public long AuditID { get; set; }
    [Required] public long UserID { get; set; }
    [Required, MaxLength(500)] public string Action { get; set; } = string.Empty;
    [Required] public DateTime ActionTime { get; set; } = DateTime.UtcNow;
    [ForeignKey(nameof(UserID))] public User User { get; set; } = null!;
}
