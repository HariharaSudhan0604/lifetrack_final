namespace Shared.CL.DTOs;

/// <summary>
/// Standard envelope returned by every API endpoint.
/// </summary>
public class ApiResponse<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Message { get; init; }
    public IReadOnlyList<string> Errors { get; init; } = [];
    public DateTime TimestampUtc { get; init; } = DateTime.UtcNow;

    // ── Factory helpers ──────────────────────────────────────────────────────

    public static ApiResponse<T> Ok(T data, string? message = null) => new()
    {
        Success = true,
        Data = data,
        Message = message
    };

    public static ApiResponse<T> Fail(string error) => new()
    {
        Success = false,
        Errors = [error]
    };

    public static ApiResponse<T> Fail(IReadOnlyList<string> errors) => new()
    {
        Success = false,
        Errors = errors
    };
}

/// <summary>
/// Non-generic variant for responses that carry no data (e.g. 204 No Content).
/// </summary>
public class ApiResponse : ApiResponse<object?>
{
    public static ApiResponse OkNoData(string? message = null) => new()
    {
        Success = true,
        Message = message
    };

    public static new ApiResponse Fail(string error) => new()
    {
        Success = false,
        Errors = [error]
    };
}
