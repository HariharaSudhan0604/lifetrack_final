using Patient.API.Models;
namespace Patient.API.Repositories.Interfaces;

public interface IPatientRepository
{
    Task<PatientRecord?> GetByIdAsync(long patientId);
    Task<(IReadOnlyList<PatientRecord> Items, int TotalCount)> ListAsync(string? enrollmentStatus, int page, int pageSize);
    Task<PatientRecord> AddAsync(PatientRecord patient);
    Task UpdateAsync(PatientRecord patient);
    /// <summary>Targeted single-column update — avoids loading the full entity and bypasses the EF change tracker.</summary>
    Task UpdateEnrollmentStatusAsync(long patientId, string newStatus);
    Task DeleteAsync(long patientId);
}
