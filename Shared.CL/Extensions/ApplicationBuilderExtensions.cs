using Microsoft.AspNetCore.Builder;
using Shared.CL.Middleware;

namespace Shared.CL.Extensions;

/// <summary>
/// Extension methods for configuring the shared middleware pipeline.
///
/// Usage in Program.cs (register before everything else):
///   app.UseGlobalExceptionHandler();
/// </summary>
public static class ApplicationBuilderExtensions
{
    /// <summary>
    /// Adds <see cref="GlobalExceptionMiddleware"/> as the outermost middleware so
    /// every unhandled exception is caught and returned as a structured JSON error.
    /// </summary>
    public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder app)
        => app.UseMiddleware<GlobalExceptionMiddleware>();
}
