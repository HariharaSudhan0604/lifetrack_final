using Microsoft.EntityFrameworkCore;
using Patient.API.Data;
using Patient.API.Models;
using Patient.API.Repositories.Interfaces;
namespace Patient.API.Repositories;

public class VisitRepository : IVisitRepository
{
    private readonly PatientDbContext _db;
    public VisitRepository(PatientDbContext db) => _db = db;

    public Task<Visit?> GetByIdAsync(long visitId) =>
        _db.Visits.FirstOrDefaultAsync(v => v.VisitID == visitId);

    public async Task<(IReadOnlyList<Visit> Items, int TotalCount)> ListByEnrollmentAsync(
        long enrollmentId, string? status, int page, int pageSize)
    {
        var q = _db.Visits.Where(v => v.EnrollmentID == enrollmentId);
        if (!string.IsNullOrEmpty(status)) q = q.Where(v => v.Status == status);
        var total = await q.CountAsync();
        var items = await q.OrderBy(v => v.VisitDate).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (items, total);
    }

    public async Task<(IReadOnlyList<Visit> Items, int TotalCount)> ListAsync(
        string? status, long? enrollmentId, int page, int pageSize)
    {
        var q = _db.Visits.AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(v => v.Status == status);
        if (enrollmentId.HasValue) q = q.Where(v => v.EnrollmentID == enrollmentId.Value);
        var total = await q.CountAsync();
        var items = await q.OrderBy(v => v.VisitDate).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (items, total);
    }

    public async Task<Visit> AddAsync(Visit visit)
    { _db.Visits.Add(visit); await _db.SaveChangesAsync(); return visit; }

    public async Task UpdateAsync(Visit visit)
    { _db.Visits.Update(visit); await _db.SaveChangesAsync(); }

    public async Task DeleteAsync(long visitId)
    {
        var v = await _db.Visits.FindAsync(visitId);
        if (v != null) { _db.Visits.Remove(v); await _db.SaveChangesAsync(); }
    }
}
