using Patient.API.Models;
namespace Patient.API.Repositories.Interfaces;

public interface IEnrollmentRepository
{
    Task<Enrollment?> GetByIdAsync(long enrollmentId);
    Task<(IReadOnlyList<Enrollment> Items, int TotalCount)> ListAsync(long? patientId, string? status, int page, int pageSize);
    Task<Enrollment> AddAsync(Enrollment enrollment);
    Task UpdateAsync(Enrollment enrollment);
    Task DeleteAsync(long enrollmentId);
}
