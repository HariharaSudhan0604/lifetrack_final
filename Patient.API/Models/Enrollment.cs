using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace Patient.API.Models;

[Table("Enrollments")]
public class Enrollment
{
    [Key] public long EnrollmentID { get; set; }
    [Required] public long PatientID { get; set; }
    /// <summary>FK → SiteProtocol in ProtocolSite DB — cross-service, no EF nav property.</summary>
    [Required] public long SiteProtocolID { get; set; }
    [Required] public DateTime EnrollmentDate { get; set; }
    public DateTime? ConsentDate { get; set; }
    [Required, MaxLength(50)] public string Status { get; set; } = "Active";
    [MaxLength(500)] public string? WithdrawalReason { get; set; }

    [ForeignKey(nameof(PatientID))] public PatientRecord? Patient { get; set; }
    public ICollection<Visit> Visits { get; set; } = [];
}
