using Patient.API.DTOs;
namespace Patient.API.Services.Interfaces;

public interface IEnrollmentService
{
    Task<EnrollmentResponse?> GetAsync(long enrollmentId);
    Task<PagedResult<EnrollmentResponse>> ListAsync(long? patientId, string? status, IReadOnlyList<long>? siteProtocolIds, int page, int pageSize);
    Task<long> CreateAsync(CreateEnrollmentRequest req);
    Task<EnrollmentResponse?> UpdateAsync(long enrollmentId, UpdateEnrollmentRequest req);
}
