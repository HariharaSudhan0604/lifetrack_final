namespace Shared.CL.Exceptions;

/// <summary>
/// Thrown when a business/domain rule is violated.
/// Caught by <see cref="Shared.CL.Filters.DomainExceptionFilter"/> and mapped to HTTP 400.
/// </summary>
public sealed class DomainException : Exception
{
    public DomainException(string message) : base(message) { }
    public DomainException(string message, Exception inner) : base(message, inner) { }
}
