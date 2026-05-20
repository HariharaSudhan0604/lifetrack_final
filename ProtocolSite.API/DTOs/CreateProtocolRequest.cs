using System.ComponentModel.DataAnnotations;
namespace ProtocolSite.API.DTOs;

public class CreateProtocolRequest
{
    [Required, MaxLength(300)] public string Title { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Phase { get; set; } = string.Empty;
    [Required] public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    [MaxLength(50)] public string Status { get; set; } = "Draft";
}
