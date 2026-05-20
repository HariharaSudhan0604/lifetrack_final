namespace ProtocolSite.API.DTOs;

public class SiteResponse
{
    public long SiteID { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}
