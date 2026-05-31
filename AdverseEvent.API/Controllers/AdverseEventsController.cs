using AdverseEvent.API.DTOs;
using AdverseEvent.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Shared.CL.Enums;
using Shared.CL.Exceptions;
using Shared.CL.Filters;

namespace AdverseEvent.API.Controllers;

[ApiController]
[Route("api/adverse-events")]
public class AdverseEventsController : ControllerBase
{
    private readonly IAdverseEventService _svc;

    public AdverseEventsController(IAdverseEventService svc) => _svc = svc;

    [HttpGet]
    public async Task<ActionResult<PagedResult<AdverseEventResponse>>> List(
        [FromQuery] long? protocolId,
        [FromQuery] long? patientId,
        [FromQuery] string? severity,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize is <= 0 or > 200) pageSize = 20;
        return Ok(await _svc.ListAsync(protocolId, patientId, severity, status, page, pageSize));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<AdverseEventResponse>> Get(long id)
    {
        var result = await _svc.GetAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [RoleAuthorize(RolesEnum.Admin, RolesEnum.ClinicalTrialManager, RolesEnum.Investigator, RolesEnum.DataManager)]
    public async Task<ActionResult> Create([FromBody] CreateAdverseEventRequest req)
    {
        try
        {
            var created = await _svc.CreateAsync(req);
            // Return only the new ID — client constructs the row from its own payload
            return StatusCode(201, new { eventID = created.EventID });
        }
        catch (DomainException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPut("{id:long}")]
    [RoleAuthorize(RolesEnum.Admin, RolesEnum.ClinicalTrialManager, RolesEnum.Investigator, RolesEnum.DataManager)]
    public async Task<ActionResult> Update(long id, [FromBody] UpdateAdverseEventRequest req)
    {
        try
        {
            var updated = await _svc.UpdateAsync(id, req);
            if (updated is null) return NotFound();
            // Client already holds the updated values — no need to echo them back
            return NoContent();
        }
        catch (DomainException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
