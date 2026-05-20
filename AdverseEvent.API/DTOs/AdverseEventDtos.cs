using System.ComponentModel.DataAnnotations;
namespace AdverseEvent.API.DTOs;

public record CreateAdverseEventRequest(
    [Required] long PatientID,
    [Required] long ProtocolID,
    [Required, MaxLength(1000)] string Description,
    [Required, MaxLength(50)] string Severity,
    [Required] DateTime ReportedDate
);
public record UpdateAdverseEventRequest(
    [Required] long PatientID,
    [Required] long ProtocolID,
    [Required, MaxLength(1000)] string Description,
    [Required, MaxLength(50)] string Severity,
    [Required, MaxLength(50)] string Status,
    [Required] DateTime ReportedDate
);
public record AdverseEventResponse(
    long EventID,
    long PatientID,
    long ProtocolID,
    string Description,
    string Severity,
    string Status,
    DateTime ReportedDate
);
