using System.ComponentModel.DataAnnotations;
namespace DocumentCompliance.API.DTOs;

// ── Document Requests ───────────────────────────────────────────────────────

public record CreateDocumentRequest(
    [Required] long ProtocolID,
    [Required, MaxLength(100)] string Type,
    [Required, MaxLength(20)] string Version,
    [Required] long UploadedBy
);

public record UpdateDocumentRequest(
    [Required] long ProtocolID,
    [Required, MaxLength(100)] string Type,
    [Required, MaxLength(20)] string Version,
    [Required, MaxLength(50)] string Status,
    [Required] long UploadedBy
);

// ── Response DTOs ───────────────────────────────────────────────────────────

public record DocumentResponse(
    long DocumentID,
    long ProtocolID,
    string Type,
    string Version,
    long UploadedBy,
    DateTime UploadedAt,
    string Status
);
