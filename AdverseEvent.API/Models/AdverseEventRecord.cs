using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace AdverseEvent.API.Models;

[Table("AdverseEvents")]
public class AdverseEventRecord
{
    [Key] public long EventID { get; set; }
    [Required] public long PatientID { get; set; }
    [Required] public long ProtocolID { get; set; }
    [Required, MaxLength(1000)] public string Description { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Severity { get; set; } = "Mild";
    [Required, MaxLength(50)] public string Status { get; set; } = "Reported";
    [Required] public DateTime ReportedDate { get; set; } = DateTime.UtcNow;
}
