using System.ComponentModel.DataAnnotations;
namespace Patient.API.DTOs;

// ── Request DTOs ─────────────────────────────────────────────────────────────

public record CreatePatientRequest(
    [Required, MaxLength(200)] string Name,
    [Required] DateTime DOB,
    [MaxLength(500)] string? ContactInfo,
    [Required, MaxLength(50)] string EnrollmentStatus,
    /// <summary>Cross-DB link to Auth.Users.UserID. Set automatically when created from patient self-registration.</summary>
    long? UserID = null
);

public record UpdatePatientRequest(
    [Required, MaxLength(200)] string Name,
    [Required] DateTime DOB,
    [MaxLength(500)] string? ContactInfo,
    [Required, MaxLength(50)] string EnrollmentStatus
);

// ── Response DTO ─────────────────────────────────────────────────────────────

public record PatientResponse(
    long PatientID,
    long? UserID,
    string Name,
    DateTime DOB,
    string? ContactInfo,
    string EnrollmentStatus
);
