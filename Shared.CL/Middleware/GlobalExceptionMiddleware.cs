using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Shared.CL.DTOs;
using Shared.CL.Exceptions;

namespace Shared.CL.Middleware;

/// <summary>
/// Terminal middleware that catches any unhandled exception escaping the MVC
/// pipeline and returns a consistent <see cref="ErrorDetail"/> JSON body.
///
/// <list type="bullet">
///   <item><see cref="DomainException"/>  → 400 Bad Request</item>
///   <item><see cref="NotFoundException"/> → 404 Not Found</item>
///   <item>Everything else               → 500 Internal Server Error</item>
/// </list>
///
/// Register in Program.cs <b>before</b> any other middleware:
///   app.UseGlobalExceptionHandler();
/// </summary>
public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        int statusCode;
        string errorTitle;

        switch (ex)
        {
            case DomainException:
                statusCode = StatusCodes.Status400BadRequest;
                errorTitle = "Business Rule Violation";
                _logger.LogWarning(ex, "Domain exception: {Message}", ex.Message);
                break;

            case NotFoundException:
                statusCode = StatusCodes.Status404NotFound;
                errorTitle = "Not Found";
                _logger.LogWarning(ex, "Not found: {Message}", ex.Message);
                break;

            case UnauthorizedAccessException:
                statusCode = StatusCodes.Status401Unauthorized;
                errorTitle = "Unauthorized";
                _logger.LogWarning(ex, "Unauthorized access attempt.");
                break;

            default:
                statusCode = StatusCodes.Status500InternalServerError;
                errorTitle = "An unexpected error occurred";
                _logger.LogError(ex, "Unhandled exception.");
                break;
        }

        var payload = new ErrorDetail
        {
            StatusCode = statusCode,
            Error = errorTitle,
            // Only surface message details for non-500 errors (avoid leaking internals)
            Details = statusCode < 500 ? [ex.Message] : [],
            TraceId = context.TraceIdentifier
        };

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = statusCode;

        await context.Response.WriteAsync(JsonSerializer.Serialize(payload, _jsonOptions));
    }
}
