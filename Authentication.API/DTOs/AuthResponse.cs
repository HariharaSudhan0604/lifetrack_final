namespace Authentication.API.DTOs;

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public SessionUser User { get; set; } = new();
}
