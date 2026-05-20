namespace Shared.CL.DTOs;

/// <summary>
/// Structured error payload returned by the global exception middleware
/// and the domain-exception filter.
/// </summary>
public sealed class ErrorDetail
{
    public int StatusCode { get; init; }
    public string Error { get; init; } = string.Empty;
    public IReadOnlyList<string> Details { get; init; } = [];
    public string TraceId { get; init; } = string.Empty;
    public DateTime TimestampUtc { get; init; } = DateTime.UtcNow;
}
