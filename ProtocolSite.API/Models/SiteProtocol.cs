using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace ProtocolSite.API.Models;

[Table("SiteProtocols")]
public class SiteProtocol
{
    [Key] public long SiteProtocolID { get; set; }
    [Required] public long SiteID { get; set; }
    [Required] public long ProtocolID { get; set; }
    /// <summary>UserID from Authentication.API — cross-service reference, no EF nav property.</summary>
    public long? InvestigatorID { get; set; }
    public DateTime? InitiationDate { get; set; }
    [Required, MaxLength(50)] public string Status { get; set; } = "Pending";

    [ForeignKey(nameof(SiteID))] public Site? Site { get; set; }
    [ForeignKey(nameof(ProtocolID))] public Protocol? Protocol { get; set; }
}
