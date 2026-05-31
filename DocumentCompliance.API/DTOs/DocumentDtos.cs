using System.ComponentModel.DataAnnotations;
namespace DocumentCompliance.API.DTOs;

public record CreateDocumentRequest(
    [Required, MaxLength(300)] string Title,
    [Required, MaxLength(100)] string Category,
    long?   ProtocolID,
    [MaxLength(20)]  string Version   = "1.0",
    [MaxLength(1000)] string? Notes   = null,
    long    UploadedBy = 0
);

public record UpdateDocumentRequest(
    [Required, MaxLength(300)] string Title,
    [Required, MaxLength(100)] string Category,
    long?   ProtocolID,
    [Required, MaxLength(20)]  string Version,
    [Required, MaxLength(50)]  string Status,
    [MaxLength(1000)] string? Notes,
    long    UploadedBy = 0
);

public record DocumentResponse(
    long     DocumentID,
    string   Title,
    string   Category,
    long?    ProtocolID,
    string   Version,
    long     UploadedBy,
    DateTime UploadedAt,
    string   Status,
    string?  Notes
);
