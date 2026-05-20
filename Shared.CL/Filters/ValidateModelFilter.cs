using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Shared.CL.DTOs;

namespace Shared.CL.Filters;

/// <summary>
/// Action filter that short-circuits the pipeline when ModelState is invalid,
/// returning a structured <see cref="ErrorDetail"/> 422 response.
///
/// Register once in Program.cs:
///   builder.Services.AddControllers(o => o.Filters.Add&lt;ValidateModelFilter&gt;());
///
/// This replaces the default 400 ValidationProblemDetails with the project's
/// standard error envelope.
/// </summary>
public sealed class ValidateModelFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (!context.ModelState.IsValid)
        {
            var errors = context.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();

            context.Result = new UnprocessableEntityObjectResult(new ErrorDetail
            {
                StatusCode = StatusCodes.Status422UnprocessableEntity,
                Error = "Validation Failed",
                Details = errors,
                TraceId = context.HttpContext.TraceIdentifier
            });
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { /* no-op */ }
}
