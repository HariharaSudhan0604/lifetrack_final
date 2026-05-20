using System.ComponentModel.DataAnnotations;
namespace Authentication.API.DTOs;

public class RegisterRequest
{
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required, EmailAddress, MaxLength(256)] public string Email { get; set; } = string.Empty;
    [Required, MinLength(8), MaxLength(128)] public string Password { get; set; } = string.Empty;
    [Required] public int RoleID { get; set; } = 3;
    [MaxLength(32)] public string? Phone { get; set; }
}
