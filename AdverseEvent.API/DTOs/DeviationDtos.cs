using System.ComponentModel.DataAnnotations;
namespace AdverseEvent.API.DTOs;

public record CreateDeviationRequest(
    [Required] long SiteProtocolID,
    [Required, MaxLength(1000)] string Description,
    [Required, MaxLength(50)] string Severity
);

public record UpdateDeviationRequest(
    [Required] long SiteProtocolID,
    [Required, MaxLength(1000)] string Description,
    [Required, MaxLength(50)] string Severity,
    [Required, MaxLength(50)] string Status
);

public record DeviationResponse(
    long DeviationID,
    long SiteProtocolID,
    string Description,
    string Severity,
    string Status
);
