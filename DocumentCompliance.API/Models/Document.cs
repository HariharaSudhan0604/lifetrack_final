using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace DocumentCompliance.API.Models;

[Table("Documents")]
public class Document
{
    [Key] public long DocumentID { get; set; }
    [Required] public long ProtocolID { get; set; }
    [Required, MaxLength(100)] public string Type { get; set; } = string.Empty;
    [Required, MaxLength(20)] public string Version { get; set; } = "1.0";
    [Required] public long UploadedBy { get; set; }
    [Required] public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(50)] public string Status { get; set; } = "Draft";
}
