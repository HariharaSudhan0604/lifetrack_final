namespace Shared.CL.Exceptions;

/// <summary>
/// Thrown when a requested resource does not exist.
/// Caught by <see cref="Shared.CL.Filters.DomainExceptionFilter"/> and mapped to HTTP 404.
/// </summary>
public sealed class NotFoundException : Exception
{
    public NotFoundException(string resourceName, object key)
        : base($"{resourceName} with id '{key}' was not found.") { }

    public NotFoundException(string message) : base(message) { }
}
