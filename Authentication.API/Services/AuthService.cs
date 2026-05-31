using Authentication.API.DTOs;
using Authentication.API.Models;
using Authentication.API.Repositories.Interfaces;
using Authentication.API.Services.Interfaces;
namespace Authentication.API.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;
    private readonly IJwtTokenService _jwt;
    private readonly IAuditLogService _audit;

    public AuthService(IUserRepository users, IPasswordHasher hasher, IJwtTokenService jwt, IAuditLogService audit)
    { _users = users; _hasher = hasher; _jwt = jwt; _audit = audit; }

    public async Task<UserResponse> RegisterAsync(RegisterRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        if (await _users.EmailExistsAsync(email))
            throw new AuthException("A user with this email already exists.");

        var user = new User
        {
            Name = req.Name.Trim(),
            Email = email,
            RoleID = req.RoleID,
            Phone = req.Phone,
            PasswordHash = _hasher.Hash(req.Password),
            IsActive = true
        };
        await _users.AddAsync(user);
        var loaded = await _users.GetByIdAsync(user.UserID) ?? user;
        await _audit.RecordAsync(user.UserID, "USER_REGISTERED");
        var roleName = loaded.RoleNavigation?.RoleName ?? GetRoleName(loaded.RoleID);
        return new UserResponse
        {
            UserID   = loaded.UserID,
            Name     = loaded.Name,
            Email    = loaded.Email,
            RoleID   = loaded.RoleID,
            Role     = roleName,
            Phone    = loaded.Phone,
            IsActive = loaded.IsActive
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await _users.GetByEmailAsync(email);
        if (user is null || !user.IsActive || !_hasher.Verify(req.Password, user.PasswordHash))
            throw new AuthException("Invalid email or password.");
        await _audit.RecordAsync(user.UserID, "USER_LOGIN");
        return BuildAuthResponse(user);
    }

    public async Task ChangePasswordAsync(long userId, ChangePasswordRequest req)
    {
        var user = await _users.GetByIdAsync(userId)
            ?? throw new AuthException("User not found.");
        if (!_hasher.Verify(req.CurrentPassword, user.PasswordHash))
            throw new AuthException("Current password is incorrect.");
        user.PasswordHash = _hasher.Hash(req.NewPassword);
        await _users.UpdateAsync(user);
        await _audit.RecordAsync(userId, "PASSWORD_CHANGED");
    }

    private AuthResponse BuildAuthResponse(User user)
    {
        var (token, expiresAt) = _jwt.Generate(user);
        var roleName = user.RoleNavigation?.RoleName ?? GetRoleName(user.RoleID);
        return new AuthResponse
        {
            Token        = token,
            ExpiresAtUtc = expiresAt,
            User         = new SessionUser
            {
                UserID = user.UserID,
                Name   = user.Name,
                Email  = user.Email,
                Role   = roleName
            }
        };
    }

    private static string GetRoleName(int id) => id switch
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
