using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace Authentication.API.Models;

[Table("Users")]
public class User
{
    [Key] public long UserID { get; set; }
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required] public int RoleID { get; set; }
    [Required, MaxLength(256)] public string Email { get; set; } = string.Empty;
    [Required, MaxLength(256)] public string PasswordHash { get; set; } = string.Empty;
    [MaxLength(32)] public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;
    public Role? RoleNavigation { get; set; }
    public ICollection<AuditLog> AuditLogs { get; set; } = [];
}
