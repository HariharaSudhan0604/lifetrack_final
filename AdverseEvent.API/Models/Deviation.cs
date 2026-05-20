using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace AdverseEvent.API.Models;

[Table("Deviations")]
public class Deviation
{
    [Key] public long DeviationID { get; set; }
    /// <summary>FK → SiteProtocol in ProtocolSite DB — cross-service, no EF nav property.</summary>
    [Required] public long SiteProtocolID { get; set; }
    [Required, MaxLength(1000)] public string Description { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Severity { get; set; } = "Minor";
    [Required, MaxLength(50)] public string Status { get; set; } = "Reported";
}
