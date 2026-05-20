using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace ProtocolSite.API.Models;

[Table("Sites")]
public class Site
{
    [Key] public long SiteID { get; set; }
    [Required, MaxLength(300)] public string Name { get; set; } = string.Empty;
    [Required, MaxLength(500)] public string Location { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Status { get; set; } = "Pending";
    public ICollection<SiteProtocol> SiteProtocols { get; set; } = [];
}
