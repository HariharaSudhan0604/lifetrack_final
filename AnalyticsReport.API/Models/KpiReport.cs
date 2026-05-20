using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace AnalyticsReport.API.Models;

[Table("KPIReports")]
public class KpiReport
{
    [Key] public long ReportID { get; set; }
    [Required, MaxLength(200)] public string Scope { get; set; } = string.Empty;
    public double EnrollmentRate { get; set; }
    public double DropoutRate { get; set; }
    public int AECount { get; set; }
    [Required] public DateTime GeneratedDate { get; set; } = DateTime.UtcNow;
}
