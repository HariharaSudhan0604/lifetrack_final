namespace Authentication.API.DTOs;

public class UserResponse
{
    public long UserID { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int RoleID { get; set; }
    public string Role { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public bool IsActive { get; set; }
}
