using Authentication.API.Models;

namespace Authentication.API.Services.Interfaces;

public interface IJwtTokenService
{
    (string Token, DateTime ExpiresAtUtc) Generate(User user);
}
