using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace Patient.API.Models;

[Table("Visits")]
public class Visit
{
    [Key] public long VisitID { get; set; }
    [Required] public long EnrollmentID { get; set; }
    [Required] public DateTime VisitDate { get; set; }
    [Required, MaxLength(50)] public string Status { get; set; } = "Scheduled";
    [MaxLength(1000)] public string Notes { get; set; } = string.Empty;
    [ForeignKey(nameof(EnrollmentID))] public Enrollment? Enrollment { get; set; }
}
