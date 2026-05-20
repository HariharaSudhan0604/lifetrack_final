using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Authentication.API.Models;
using Authentication.API.Services.Interfaces;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
namespace Authentication.API.Services;

public class JwtTokenService : IJwtTokenService
{
    private readonly JwtSettings _settings;
    public JwtTokenService(IOptions<JwtSettings> options) => _settings = options.Value;
    public (string Token, DateTime ExpiresAtUtc) Generate(User user)
    {
        var expires = DateTime.UtcNow.AddMinutes(_settings.ExpiryMinutes);
        var roleName = user.RoleNavigation?.RoleName ?? GetRoleName(user.RoleID);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   user.UserID.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier,     user.UserID.ToString()),
            new(ClaimTypes.Name,               user.Name),
            new(ClaimTypes.Email,              user.Email),
            new(ClaimTypes.Role,               roleName)
        };
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _settings.Issuer, audience: _settings.Audience,
            claims: claims, notBefore: DateTime.UtcNow, expires: expires,
            signingCredentials: creds);
        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
    private static string GetRoleName(int roleId) => roleId switch
    {
        1 => "Admin",
        2 => "ClinicalTrialManager",
        3 => "Investigator",
        4 => "Patient",
        5 => "RegulatoryOfficer",
        6 => "DataManager",
        _ => "Unknown"
    };
}
