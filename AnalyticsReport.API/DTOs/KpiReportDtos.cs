using System.ComponentModel.DataAnnotations;
namespace AnalyticsReport.API.DTOs;

public record CreateKpiReportRequest(
    [Required, MaxLength(200)] string Scope,
    double    EnrollmentRate,
    double    DropoutRate,
    double    VisitComplianceRate,
    double    PatientRetentionRate,
    int       TotalProtocols,
    int       TotalPatients,
    int       TotalEnrollments,
    int       ActiveEnrollments,
    int       TotalVisits,
    int       AECount,
    int       MildAEs,
    int       ModerateAEs,
    int       SevereAEs,
    int       DevCount,
    int       ReportedDevs,
    int       ResolvedDevs,
    DateTime? GeneratedDate,
    DateTime? StartDate,
    DateTime? EndDate
);

public record UpdateKpiReportRequest(
    [Required, MaxLength(200)] string Scope,
    double EnrollmentRate,
    double DropoutRate,
    double VisitComplianceRate,
    double PatientRetentionRate,
    int    TotalProtocols,
    int    TotalPatients,
    int    TotalEnrollments,
    int    ActiveEnrollments,
    int    TotalVisits,
    int    AECount,
    int    MildAEs,
    int    ModerateAEs,
    int    SevereAEs,
    int    DevCount,
    int    ReportedDevs,
    int    ResolvedDevs
);

public record KpiReportResponse(
    long      ReportID,
    string    Scope,
    double    EnrollmentRate,
    double    DropoutRate,
    double    VisitComplianceRate,
    double    PatientRetentionRate,
    int       TotalProtocols,
    int       TotalPatients,
    int       TotalEnrollments,
    int       ActiveEnrollments,
    int       TotalVisits,
    int       AECount,
    int       MildAEs,
    int       ModerateAEs,
    int       SevereAEs,
    int       DevCount,
    int       ReportedDevs,
    int       ResolvedDevs,
    DateTime  GeneratedDate,
    string    Status,
    DateTime? ReviewedAt,
    DateTime? StartDate,
    DateTime? EndDate
);
