using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace AnalyticsReport.API.Models;

[Table("KPIReports")]
public class KpiReport
{
    [Key] public long ReportID { get; set; }
    [Required, MaxLength(200)] public string Scope { get; set; } = string.Empty;

    // ── Rates ──────────────────────────────────────────────────────────────────
    public double EnrollmentRate       { get; set; }
    public double DropoutRate          { get; set; }
    public double VisitComplianceRate  { get; set; }
    public double PatientRetentionRate { get; set; }

    // ── Totals ─────────────────────────────────────────────────────────────────
    public int TotalProtocols    { get; set; }
    public int TotalPatients     { get; set; }
    public int TotalEnrollments  { get; set; }
    public int ActiveEnrollments { get; set; }
    public int TotalVisits       { get; set; }

    // ── Adverse Events ─────────────────────────────────────────────────────────
    public int AECount     { get; set; }
    public int MildAEs     { get; set; }
    public int ModerateAEs { get; set; }
    public int SevereAEs   { get; set; }

    // ── Deviations ─────────────────────────────────────────────────────────────
    public int DevCount     { get; set; }
    public int ReportedDevs { get; set; }
    public int ResolvedDevs { get; set; }

    public DateTime? StartDate { get; set; }
    public DateTime? EndDate   { get; set; }
    [Required] public DateTime GeneratedDate { get; set; } = DateTime.UtcNow;

    /// <summary>Draft until a Regulatory Officer marks it Reviewed.</summary>
    [MaxLength(20)] public string Status { get; set; } = "Draft";
    public DateTime? ReviewedAt { get; set; }
}
