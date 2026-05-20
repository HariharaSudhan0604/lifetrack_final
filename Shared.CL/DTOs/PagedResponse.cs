namespace Shared.CL.DTOs;

/// <summary>
/// Paged list envelope — wraps a page of items together with pagination metadata.
/// </summary>
public sealed class PagedResponse<T>
{
    public bool Success { get; init; } = true;
    public IReadOnlyList<T> Data { get; init; } = [];
    public int TotalCount { get; init; }
    public int Skip { get; init; }
    public int Take { get; init; }
    public bool HasMore => Skip + Take < TotalCount;
    public DateTime TimestampUtc { get; init; } = DateTime.UtcNow;

    public static PagedResponse<T> Create(IReadOnlyList<T> data, int totalCount, int skip, int take) => new()
    {
        Data = data,
        TotalCount = totalCount,
        Skip = skip,
        Take = take
    };
}
