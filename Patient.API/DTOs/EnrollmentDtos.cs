using System.ComponentModel.DataAnnotations;
namespace Patient.API.DTOs;

// ── Request DTOs ────────────────────────────────────────────────────────────

public record CreateEnrollmentRequest(
    [Required] long PatientID,
    [Required] long SiteProtocolID,
    [Required] DateTime EnrollmentDate,
    DateTime? ConsentDate,
    [MaxLength(50)] string Status = "Active"
);

public record UpdateEnrollmentRequest(
    DateTime? ConsentDate,
    [Required, MaxLength(50)] string Status,
    [MaxLength(500)] string? WithdrawalReason
);

// ── Response DTO ────────────────────────────────────────────────────────────

public record EnrollmentResponse(
    long EnrollmentID,
    long PatientID,
    long SiteProtocolID,
    DateTime EnrollmentDate,
    DateTime? ConsentDate,
    string Status,
    string? WithdrawalReason
);
