using System.ComponentModel.DataAnnotations;
namespace ProtocolSite.API.DTOs;

public class CreateSiteProtocolRequest
{
    [Required] public long SiteID { get; set; }
    [Required] public long ProtocolID { get; set; }
    public long? InvestigatorID { get; set; }
    public DateTime? InitiationDate { get; set; }
    [Required, MaxLength(50)] public string Phase { get; set; } = "Preclinical";
    [MaxLength(50)] public string Status { get; set; } = "Pending";
}

public class UpdateSiteProtocolRequest
{
    public long? InvestigatorID { get; set; }
    public DateTime? InitiationDate { get; set; }
    [Required, MaxLength(50)] public string Phase { get; set; } = "Preclinical";
    [Required, MaxLength(50)] public string Status { get; set; } = "Pending";
}

public class SiteProtocolResponse
{
    public long SiteProtocolID { get; set; }
    public long SiteID { get; set; }
    public long ProtocolID { get; set; }
    public long? InvestigatorID { get; set; }
    public DateTime? InitiationDate { get; set; }
    public string Phase { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}
