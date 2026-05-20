using Authentication.API.DTOs;
namespace Authentication.API.Services.Interfaces;

public interface IAuthService
{
    Task<UserResponse> RegisterAsync(RegisterRequest req);
    Task<AuthResponse> LoginAsync(LoginRequest req);
    Task ChangePasswordAsync(long userId, ChangePasswordRequest req);
}
public class AuthException : Exception
{
    public AuthException(string message) : base(message) { }
}
