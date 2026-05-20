using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace Authentication.API.Models;

[Table("Roles")]
public class Role
{
    [Key] public int RoleID { get; set; }
    [Required, MaxLength(100)] public string RoleName { get; set; } = string.Empty;
    public ICollection<User> Users { get; set; } = [];
}
