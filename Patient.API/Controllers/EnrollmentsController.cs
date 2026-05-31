using Microsoft.AspNetCore.Mvc;
using Patient.API.DTOs;
using Patient.API.Services.Interfaces;
using Shared.CL.Enums;
using Shared.CL.Exceptions;
using Shared.CL.Filters;
namespace Patient.API.Controllers;

[ApiController]
[Route("api/enrollments")]
public class EnrollmentsController : ControllerBase
{
    private readonly IEnrollmentService _svc;
    public EnrollmentsController(IEnrollmentService svc) => _svc = svc;

    [HttpGet]
    public async Task<ActionResult<PagedResult<EnrollmentResponse>>> List(
        [FromQuery] long? patientId,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize is <= 0 or > 200) pageSize = 20;
        return Ok(await _svc.ListAsync(patientId, status, page, pageSize));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<EnrollmentResponse>> Get(long id)
    {
        var result = await _svc.GetAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [RoleAuthorize(RolesEnum.Admin, RolesEnum.ClinicalTrialManager, RolesEnum.Investigator)]
    public async Task<ActionResult> Create([FromBody] CreateEnrollmentRequest req)
    {
        try
        {
            var created = await _svc.CreateAsync(req);
            // Return only the new ID — the client already holds all other field values
            return StatusCode(201, new { enrollmentID = created.EnrollmentID });
        }
        catch (DomainException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPut("{id:long}")]
    [RoleAuthorize(RolesEnum.Admin, RolesEnum.ClinicalTrialManager, RolesEnum.Investigator)]
    public async Task<ActionResult> Update(long id, [FromBody] UpdateEnrollmentRequest req)
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
