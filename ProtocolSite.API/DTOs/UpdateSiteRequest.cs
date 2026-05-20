using System.ComponentModel.DataAnnotations;
namespace ProtocolSite.API.DTOs;

public class UpdateSiteRequest
{
    [Required, MaxLength(300)] public string Name { get; set; } = string.Empty;
    [Required, MaxLength(500)] public string Location { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Status { get; set; } = "Pending";
}
