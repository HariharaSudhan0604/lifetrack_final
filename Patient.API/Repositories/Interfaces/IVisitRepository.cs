using Patient.API.Models;
namespace Patient.API.Repositories.Interfaces;

public interface IVisitRepository
{
    Task<Visit?> GetByIdAsync(long visitId);
    Task<(IReadOnlyList<Visit> Items, int TotalCount)> ListByEnrollmentAsync(long enrollmentId, string? status, int page, int pageSize);
    Task<(IReadOnlyList<Visit> Items, int TotalCount)> ListAsync(string? status, long? enrollmentId, int page, int pageSize);
    Task<Visit> AddAsync(Visit visit);
    Task UpdateAsync(Visit visit);
    Task DeleteAsync(long visitId);
}
