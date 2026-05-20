namespace Shared.CL.DTOs;

/// <summary>
/// DTO used when creating an audit log entry (sent to Authentication.API).
/// </summary>
public record AuditLogCreateDto
{
    public long? UserId { get; init; }
    public string? UserEmail { get; init; }
    public string Action { get; init; } = string.Empty;
    public string ServiceName { get; init; } = string.Empty;
    public bool IsError { get; init; }
    public string? ErrorMessage { get; init; }
}

/// <summary>
/// DTO returned when listing audit log entries.
/// </summary>
public record AuditLogListDto : AuditLogCreateDto
{
    public DateTime CreatedAt { get; init; }
}
