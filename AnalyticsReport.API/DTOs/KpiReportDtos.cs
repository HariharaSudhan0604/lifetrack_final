using System.ComponentModel.DataAnnotations;
namespace AnalyticsReport.API.DTOs;

public record CreateKpiReportRequest(
    [Required, MaxLength(200)] string Scope,
    double EnrollmentRate,
    double DropoutRate,
    int AECount,
    DateTime? GeneratedDate
);
public record UpdateKpiReportRequest(
    [Required, MaxLength(200)] string Scope,
    double EnrollmentRate,
    double DropoutRate,
    int AECount
);
public record KpiReportResponse(
    long ReportID,
    string Scope,
    double EnrollmentRate,
    double DropoutRate,
    int AECount,
    DateTime GeneratedDate
);
