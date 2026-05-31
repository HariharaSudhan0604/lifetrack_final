using AnalyticsReport.API.DTOs;
using AnalyticsReport.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Shared.CL.Enums;
using Shared.CL.Exceptions;
using Shared.CL.Filters;

namespace AnalyticsReport.API.Controllers;

[ApiController]
[Route("api/kpi-reports")]
public class KpiReportsController : ControllerBase
{
    private readonly IKpiReportService _svc;

    public KpiReportsController(IKpiReportService svc) => _svc = svc;

    [HttpGet]
    public async Task<ActionResult<PagedResult<KpiReportResponse>>> List(
        [FromQuery] string? scope,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize is <= 0 or > 200) pageSize = 20;
        return Ok(await _svc.ListAsync(scope, status, page, pageSize));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<KpiReportResponse>> Get(long id)
    {
        var r = await _svc.GetAsync(id);
        return r is null ? NotFound() : Ok(r);
    }

    [HttpPost]
    [RoleAuthorize(RolesEnum.Admin, RolesEnum.DataManager)]
    public async Task<ActionResult<KpiReportResponse>> Create([FromBody] CreateKpiReportRequest req)
    {
        try
        {
            var created = await _svc.CreateAsync(req);
            return CreatedAtAction(nameof(Get), new { id = created.ReportID }, created);
        }
        catch (DomainException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPatch("{id:long}/review")]
    [RoleAuthorize(RolesEnum.RegulatoryOfficer)]
    public async Task<ActionResult<KpiReportResponse>> Review(long id)
    {
        var result = await _svc.ReviewAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

}
