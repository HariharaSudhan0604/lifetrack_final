using Microsoft.EntityFrameworkCore;
using Patient.API.Data;
using Patient.API.Models;
using Patient.API.Repositories.Interfaces;
namespace Patient.API.Repositories;

public class PatientRepository : IPatientRepository
{
    private readonly PatientDbContext _db;
    public PatientRepository(PatientDbContext db) => _db = db;

    public Task<PatientRecord?> GetByIdAsync(long patientId) =>
        _db.Patients.Include(p => p.Enrollments).FirstOrDefaultAsync(p => p.PatientID == patientId);

    public async Task<(IReadOnlyList<PatientRecord> Items, int TotalCount)> ListAsync(
        string? enrollmentStatus, int page, int pageSize)
    {
        var q = _db.Patients.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(enrollmentStatus))
            q = q.Where(p => p.EnrollmentStatus == enrollmentStatus);

        var total = await q.CountAsync();
        var items = await q.OrderBy(p => p.Name).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (items, total);
    }

    public async Task<PatientRecord> AddAsync(PatientRecord patient)
    { _db.Patients.Add(patient); await _db.SaveChangesAsync(); return patient; }

    public async Task UpdateAsync(PatientRecord patient)
    { _db.Patients.Update(patient); await _db.SaveChangesAsync(); }

    /// <summary>
    /// Issues a targeted UPDATE SET EnrollmentStatus = @newStatus WHERE PatientID = @patientId.
    /// Uses ExecuteUpdateAsync so it bypasses the EF change-tracker entirely — safe to call
    /// even while other entities for the same patient are already tracked in the same DbContext.
    /// </summary>
    public async Task UpdateEnrollmentStatusAsync(long patientId, string newStatus) =>
        await _db.Patients
            .Where(p => p.PatientID == patientId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.EnrollmentStatus, newStatus));

    public async Task DeleteAsync(long patientId)
    {
        var p = await _db.Patients.FindAsync(patientId);
        if (p != null) { _db.Patients.Remove(p); await _db.SaveChangesAsync(); }
    }
}
