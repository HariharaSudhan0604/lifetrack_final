using System.ComponentModel.DataAnnotations;
namespace Authentication.API.DTOs;

public class UpdateUserRequest
{
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required] public int RoleID { get; set; }
    [MaxLength(32)] public string? Phone { get; set; }
}
