using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Shared.CL.DTOs;
using Shared.CL.Exceptions;

namespace Shared.CL.Filters;

/// <summary>
/// Action filter that intercepts <see cref="DomainException"/> and
/// <see cref="NotFoundException"/> thrown from controllers or services and
/// converts them to structured HTTP responses without bubbling to the
/// global exception handler.
///
/// Register once in Program.cs:
///   builder.Services.AddControllers(o => o.Filters.Add&lt;DomainExceptionFilter&gt;());
/// </summary>
public sealed class DomainExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        switch (context.Exception)
        {
            case DomainException domEx:
                context.Result = new BadRequestObjectResult(new ErrorDetail
                {
                    StatusCode = StatusCodes.Status400BadRequest,
                    Error = "Business Rule Violation",
                    Details = [domEx.Message],
                    TraceId = context.HttpContext.TraceIdentifier
                });
                context.ExceptionHandled = true;
                break;

            case NotFoundException notFound:
                context.Result = new NotFoundObjectResult(new ErrorDetail
                {
                    StatusCode = StatusCodes.Status404NotFound,
                    Error = "Not Found",
                    Details = [notFound.Message],
                    TraceId = context.HttpContext.TraceIdentifier
                });
                context.ExceptionHandled = true;
                break;
        }
    }
}
