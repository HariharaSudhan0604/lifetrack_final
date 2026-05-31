using AdverseEvent.API.DTOs;
using AdverseEvent.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Shared.CL.Enums;
using Shared.CL.Exceptions;
using Shared.CL.Filters;

namespace AdverseEvent.API.Controllers;

[ApiController]
[Route("api/deviations")]
public class DeviationsController : ControllerBase
{
    private readonly IDeviationService _svc;

    public DeviationsController(IDeviationService svc) => _svc = svc;

    [HttpGet]
    public async Task<ActionResult<PagedResult<DeviationResponse>>> List(
        [FromQuery] long? siteProtocolId,
        [FromQuery] string? severity,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize is <= 0 or > 200) pageSize = 20;
        return Ok(await _svc.ListAsync(siteProtocolId, severity, status, page, pageSize));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<DeviationResponse>> Get(long id)
    {
        var result = await _svc.GetAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [RoleAuthorize(RolesEnum.Admin, RolesEnum.ClinicalTrialManager, RolesEnum.Investigator, RolesEnum.DataManager)]
    public async Task<ActionResult> Create([FromBody] CreateDeviationRequest req)
    {
        try
        {
            var created = await _svc.CreateAsync(req);
            return StatusCode(201, new { deviationID = created.DeviationID });
        }
        catch (DomainException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPut("{id:long}")]
    [RoleAuthorize(RolesEnum.Admin, RolesEnum.ClinicalTrialManager, RolesEnum.Investigator, RolesEnum.DataManager)]
    public async Task<ActionResult> Update(long id, [FromBody] UpdateDeviationRequest req)
    {
        try
        {
            var updated = await _svc.UpdateAsync(id, req);
            return updated is null ? NotFound() : NoContent();
        }
        catch (DomainException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
