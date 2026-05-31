using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace DocumentCompliance.API.Models;

[Table("Documents")]
public class Document
{
    [Key] public long DocumentID { get; set; }

    [Required, MaxLength(300)] public string Title { get; set; } = string.Empty;

    /// <summary>Document category — maps to one of the 17 eTMF-aligned categories.</summary>
    [Required, MaxLength(100)] public string Category { get; set; } = "Other";

    public long? ProtocolID { get; set; }

    [Required, MaxLength(20)]  public string Version    { get; set; } = "1.0";
    [Required] public long     UploadedBy  { get; set; }
    [Required] public DateTime UploadedAt  { get; set; } = DateTime.UtcNow;
    [Required, MaxLength(50)]  public string Status     { get; set; } = "Draft";

    /// <summary>Optional notes for this document.</summary>
    [MaxLength(1000)] public string? Notes { get; set; }
}
