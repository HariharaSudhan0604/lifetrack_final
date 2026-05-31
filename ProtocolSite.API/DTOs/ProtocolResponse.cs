namespace ProtocolSite.API.DTOs;

public class ProtocolResponse
{
    public long ProtocolID { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
}
