using System.Text.Json.Serialization;

namespace Authentication.API.DTOs;

public class UserResponse
{
    public long   UserID   { get; set; }
    public string Name     { get; set; } = string.Empty;
    public string Email    { get; set; } = string.Empty;
    public int    RoleID   { get; set; }
    public string Role     { get; set; } = string.Empty;
    /// <summary>Always serialised (never omitted), so Angular receives null instead of a missing key.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? Phone   { get; set; }
    public bool   IsActive { get; set; }
}
