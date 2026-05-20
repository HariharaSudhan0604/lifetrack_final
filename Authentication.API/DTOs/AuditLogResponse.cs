namespace Authentication.API.DTOs;

public class AuditLogResponse
{
    public long AuditID { get; set; }
    public long UserID { get; set; }
    public string? UserName { get; set; }
    public string Action { get; set; } = string.Empty;
    public DateTime ActionTime { get; set; }
}
