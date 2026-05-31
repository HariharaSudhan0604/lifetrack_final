using System.ComponentModel.DataAnnotations;
namespace Patient.API.DTOs;

// ── Request DTOs ────────────────────────────────────────────────────────────

public record CreateVisitRequest(
    [Required] long EnrollmentID,
    [Required] DateTime VisitDate,
    [Required, MaxLength(50)] string Status,
    [MaxLength(1000)] string? Notes
);

// EnrollmentID intentionally omitted — the linked enrollment cannot change after creation.
public record UpdateVisitRequest(
    [Required] DateTime VisitDate,
    [Required, MaxLength(50)] string Status,
    [MaxLength(1000)] string? Notes
);

// ── Response DTO ────────────────────────────────────────────────────────────

public record VisitResponse(
    long VisitID,
    long EnrollmentID,
    DateTime VisitDate,
    string Status,
    string Notes
);
