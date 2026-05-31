namespace Authentication.API.DTOs;

/// <summary>
/// Minimal user payload returned inside the login/auth response.
/// Only carries what the frontend session needs — no PII beyond email,
/// no internal IDs (RoleID), no server-side flags (IsActive).
/// </summary>
public class SessionUser
{
    public long   UserID { get; set; }
    public string Name   { get; set; } = string.Empty;
    public string Email  { get; set; } = string.Empty;
    public string Role   { get; set; } = string.Empty;
}
