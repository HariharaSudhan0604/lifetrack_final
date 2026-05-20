using System.Security.Claims;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;

namespace Shared.CL.Filters;

/// <summary>
/// Action filter that logs every successful (non-exception) request.
/// Runs after the action has executed; skipped when the action throws.
///
/// Register once in Program.cs:
///   builder.Services.AddControllers(o => o.Filters.Add&lt;ActivityLogFilter&gt;());
/// </summary>
public class ActivityLogFilter : IAsyncActionFilter
{
    private readonly ILogger<ActivityLogFilter> _logger;

    public ActivityLogFilter(ILogger<ActivityLogFilter> logger) => _logger = logger;

    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next)
    {
        ActionExecutedContext executed = await next();

        // Only log when no exception occurred (exceptions are handled by GlobalExceptionMiddleware).
        if (executed.Exception is not null && !executed.ExceptionHandled) return;

        string method = context.HttpContext.Request.Method;
        string path = context.HttpContext.Request.Path;
        string? userId = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        string? email = context.HttpContext.User.FindFirstValue(ClaimTypes.Email);
        int statusCode = context.HttpContext.Response.StatusCode;

        _logger.LogInformation(
            "Activity | {Method} {Path} | User: {UserId} ({Email}) | Status: {StatusCode}",
            method, path, userId ?? "anonymous", email ?? "-", statusCode);
    }
}
