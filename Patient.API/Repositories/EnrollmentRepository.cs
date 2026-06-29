using Microsoft.EntityFrameworkCore;
using Patient.API.Data;
using Patient.API.Models;
using Patient.API.Repositories.Interfaces;
namespace Patient.API.Repositories;

public class EnrollmentRepository : IEnrollmentRepository
{
    private readonly PatientDbContext _db;
    public EnrollmentRepository(PatientDbContext db) => _db = db;

    public Task<Enrollment?> GetByIdAsync(long enrollmentId) =>
        _db.Enrollments.Include(e => e.Patient).FirstOrDefaultAsync(e => e.EnrollmentID == enrollmentId);

    public async Task<(IReadOnlyList<Enrollment> Items, int TotalCount)> ListAsync(
        long? patientId, string? status, IReadOnlyList<long>? siteProtocolIds, int page, int pageSize)
    {
        var q = _db.Enrollments.AsNoTracking().AsQueryable();
        if (patientId.HasValue) q = q.Where(e => e.PatientID == patientId.Value);
        if (!string.IsNullOrEmpty(status)) q = q.Where(e => e.Status == status);
        if (siteProtocolIds is { Count: > 0 }) q = q.Where(e => siteProtocolIds.Contains(e.SiteProtocolID));
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(e => e.EnrollmentDate).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (items, total);
    }

    public Task<bool> ExistsAsync(long patientId, long siteProtocolId) =>
        _db.Enrollments.AnyAsync(e => e.PatientID == patientId && e.SiteProtocolID == siteProtocolId);

    public async Task<Enrollment> AddAsync(Enrollment enrollment)
    { _db.Enrollments.Add(enrollment); await _db.SaveChangesAsync(); return enrollment; }

    public async Task UpdateAsync(Enrollment enrollment)
    { _db.Enrollments.Update(enrollment); await _db.SaveChangesAsync(); }

    public async Task DeleteAsync(long enrollmentId)
    {
        var e = await _db.Enrollments.FindAsync(enrollmentId);
        if (e != null) { _db.Enrollments.Remove(e); await _db.SaveChangesAsync(); }
    }
}
