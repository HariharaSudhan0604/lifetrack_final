using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace ProtocolSite.API.Models;

[Table("Protocols")]
public class Protocol
{
    [Key] public long ProtocolID { get; set; }
    [Required, MaxLength(300)] public string Title { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Phase { get; set; } = string.Empty;
    [Required] public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    [Required, MaxLength(50)] public string Status { get; set; } = "Draft";
    public ICollection<SiteProtocol> SiteProtocols { get; set; } = [];
}
