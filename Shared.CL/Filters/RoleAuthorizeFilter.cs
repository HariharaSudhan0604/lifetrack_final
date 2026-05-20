using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Shared.CL.DTOs;
using Shared.CL.Enums;

namespace Shared.CL.Filters;

/// <summary>
/// Authorization filter that enforces role-based access control using <see cref="RolesEnum"/>.
/// Instantiated through <see cref="RoleAuthorizeAttribute"/>.
///
/// Evaluation order:
///   1. [AllowAnonymous] → skip all checks.
///   2. User is not authenticated → 401 Unauthorized.
///   3. User's role is not in <paramref name="allowedRoles"/> → 403 Forbidden.
/// </summary>
public class RoleAuthorizeFilter : IAsyncAuthorizationFilter
{
    private readonly RolesEnum[] _allowedRoles;

    public RoleAuthorizeFilter(RolesEnum[] roles) => _allowedRoles = roles;

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        // Opt-out: endpoint is explicitly anonymous.
        bool allowAnonymous = context.ActionDescriptor.EndpointMetadata
            .Any(em => em.GetType() == typeof(AllowAnonymousAttribute));
        if (allowAnonymous) return;

        // 401 — no authenticated user (JwtAuthFilter should have set the principal).
        if (context.HttpContext.User.Identity?.IsAuthenticated != true)
        {
            context.Result = new ObjectResult(
                ApiResponse<object>.Fail("Unauthorized. Please log in."))
            { StatusCode = 401 };
            return;
        }

        // 403 — user is authenticated but not in an allowed role.
        string? userRole = context.HttpContext.User.FindFirstValue(ClaimTypes.Role);
        bool hasRole = _allowedRoles.Any(r =>
            string.Equals(r.ToString(), userRole, StringComparison.OrdinalIgnoreCase));

        if (!hasRole)
        {
            context.Result = new ObjectResult(
                ApiResponse<object>.Fail("Forbidden. You do not have permission to access this resource."))
            { StatusCode = 403 };
        }

        await Task.CompletedTask;
    }
}

/// <summary>
/// Attribute that applies <see cref="RoleAuthorizeFilter"/> to a controller or action.
/// Replaces <c>[Authorize(Roles = "...")]</c> with a typed, compile-safe alternative.
///
/// Usage:
///   [RoleAuthorize(RolesEnum.Admin, RolesEnum.ClinicalTrialManager)]
///   public async Task&lt;IActionResult&gt; Create(...) { }
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public class RoleAuthorizeAttribute : TypeFilterAttribute
{
    public RoleAuthorizeAttribute(params RolesEnum[] roles)
        : base(typeof(RoleAuthorizeFilter))
    {
        Arguments = new object[] { roles };
    }
}
