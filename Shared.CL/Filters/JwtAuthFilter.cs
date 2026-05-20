using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Shared.CL.DTOs;

namespace Shared.CL.Filters;

/// <summary>
/// Global authorization filter that validates JWT Bearer tokens on every request.
/// Endpoints decorated with [AllowAnonymous] are skipped automatically.
///
/// Register once in Program.cs:
///   builder.Services.AddControllers(o => o.Filters.Add&lt;JwtAuthFilter&gt;());
///
/// This replaces AddAuthentication().AddJwtBearer() middleware — no UseAuthentication()
/// or UseAuthorization() calls are required.
/// </summary>
public class JwtAuthFilter : IAsyncAuthorizationFilter
{
    private readonly IConfiguration _config;

    public JwtAuthFilter(IConfiguration config) => _config = config;

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        // Skip for endpoints that explicitly opt out of authentication.
        bool allowAnonymous = context.ActionDescriptor.EndpointMetadata
            .Any(em => em.GetType() == typeof(AllowAnonymousAttribute));
        if (allowAnonymous) return;

        string? authHeader = context.HttpContext.Request.Headers["Authorization"]
            .FirstOrDefault();

        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            context.Result = new ObjectResult(
                ApiResponse<object>.Fail("Unauthorized. Missing or invalid token."))
            { StatusCode = 401 };
            return;
        }

        string token = authHeader["Bearer ".Length..].Trim();

        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            string secretKey = _config["Jwt:Secret"]
                ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                                               Encoding.UTF8.GetBytes(secretKey)),
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30)
            };

            ClaimsPrincipal principal = tokenHandler.ValidateToken(
                token, validationParameters, out _);

            context.HttpContext.User = principal;
        }
        catch (Exception ex)
        {
            context.Result = new ObjectResult(
                ApiResponse<object>.Fail(
                    "Unauthorized. Token expired or invalid. " + ex.Message))
            { StatusCode = 401 };
        }

        await Task.CompletedTask;
    }
}
