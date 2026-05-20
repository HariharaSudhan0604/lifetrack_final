namespace DocumentCompliance.API.Models;

public class DocumentVersion
{
    public int DocumentVersionId { get; set; }

    public int DocumentId { get; set; }

    public Document Document { get; set; } = null!;

    public int VersionNumber { get; set; }

    /// <summary>Relative or absolute file path / blob reference.</summary>
    public string FilePath { get; set; } = string.Empty;

    public long FileSizeBytes { get; set; }

    public string ContentType { get; set; } = string.Empty;

    /// <summary>Logical ref to User.UserId in lifetrack_governance_db.</summary>
    public int UploadedByUserId { get; set; }

    public DateTime UploadedAt { get; set; }

    public string? Notes { get; set; }
}
