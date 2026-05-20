using System.ComponentModel.DataAnnotations;
namespace Authentication.API.DTOs;

/// <summary>Patient self-registration form. On success the user account and patient record are both created.</summary>
public class PatientRegisterRequest
{
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required, EmailAddress, MaxLength(256)] public string Email { get; set; } = string.Empty;
    [Required, MinLength(8), MaxLength(128)] public string Password { get; set; } = string.Empty;
    [MaxLength(32)] public string? Phone { get; set; }

    /// <summary>Patient's date of birth — stored in the Patient record.</summary>
    [Required] public DateTime DOB { get; set; }
}
