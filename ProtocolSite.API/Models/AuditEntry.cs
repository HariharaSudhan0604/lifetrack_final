using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace ProtocolSite.API.Models;
/// <summary>Lightweight local audit trail written by ProtocolSiteDbContext.SaveChangesAsync.</summary>
[Table("AuditEntries")]
public class AuditEntry
{
    [Key] public long AuditEntryID { get; set; }
    [Required, MaxLength(100)] public string EntityName { get; set; } = string.Empty;
    [MaxLength(100)] public string? PrimaryKey { get; set; }
    /// <summary>Insert | Update | Delete</summary>
    [Required, MaxLength(20)] public string Action { get; set; } = string.Empty;
    /// <summary>UserID from JWT claim — set by callers via DbContext property; null when not available.</summary>
    public long? ChangedByUserID { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
}
