using DocumentCompliance.API.Data;
using DocumentCompliance.API.Models;
using DocumentCompliance.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace DocumentCompliance.API.Repositories;

public class DocumentRepository : IDocumentRepository
{
    private readonly DocumentDbContext _db;

    public DocumentRepository(DocumentDbContext db) => _db = db;

    public Task<Document?> GetByIdAsync(long documentId)
        => _db.Documents.FirstOrDefaultAsync(d => d.DocumentID == documentId);

    public async Task<(IReadOnlyList<Document> Items, int TotalCount)> ListAsync(
        long? protocolId, string? status, string? category, int page, int pageSize)
    {
        var q = _db.Documents.AsQueryable();
        if (protocolId.HasValue)          q = q.Where(d => d.ProtocolID == protocolId.Value);
        if (!string.IsNullOrEmpty(status))   q = q.Where(d => d.Status   == status);
        if (!string.IsNullOrEmpty(category)) q = q.Where(d => d.Category == category);
        q = q.OrderByDescending(d => d.UploadedAt);
        var total = await q.CountAsync();
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (items, total);
    }

    public async Task<Document> AddAsync(Document document)
    {
        _db.Documents.Add(document);
        await _db.SaveChangesAsync();
        return document;
    }

    public async Task UpdateAsync(Document document)
    {
        _db.Documents.Update(document);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(long documentId)
    {
        var d = await _db.Documents.FindAsync(documentId);
        if (d != null)
        {
            _db.Documents.Remove(d);
            await _db.SaveChangesAsync();
        }
    }
}
