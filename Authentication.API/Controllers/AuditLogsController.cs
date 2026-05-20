using Authentication.API.DTOs;
using Authentication.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Shared.CL.Enums;
using Shared.CL.Filters;
namespace Authentication.API.Controllers;

[ApiController]
[Route("api/audit-logs")]
[RoleAuthorize(RolesEnum.Admin, RolesEnum.RegulatoryOfficer)]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _audit;
    public AuditLogsController(IAuditLogService audit) => _audit = audit;

    [HttpGet]
    public async Task<ActionResult<PagedResult<AuditLogResponse>>> List(
        [FromQuery] long? userId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize is <= 0 or > 500) pageSize = 20;
        return Ok(await _audit.ListAsync(userId, page, pageSize));
    }
}
