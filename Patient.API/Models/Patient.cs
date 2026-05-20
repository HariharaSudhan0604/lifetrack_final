using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace Patient.API.Models;

[Table("Patients")]
public class PatientRecord
{
    [Key] public long PatientID { get; set; }

    /// <summary>
    /// Cross-database reference to Authentication.API → Users.UserID.
    /// Populated when a patient self-registers; null for patients added by staff.
    /// No FK constraint (different databases).
    /// </summary>
    public long? UserID { get; set; }

    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required] public DateTime DOB { get; set; }
    [MaxLength(500)] public string ContactInfo { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string EnrollmentStatus { get; set; } = "Screening";

    public ICollection<Enrollment> Enrollments { get; set; } = [];
}
