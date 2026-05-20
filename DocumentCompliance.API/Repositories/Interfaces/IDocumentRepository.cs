using DocumentCompliance.API.Models;

namespace DocumentCompliance.API.Repositories.Interfaces;

public interface IDocumentRepository
{
    Task<Document?> GetByIdAsync(long documentId);
    Task<(IReadOnlyList<Document> Items, int TotalCount)> ListAsync(
        long? protocolId, string? status, string? type, int page, int pageSize);
    Task<Document> AddAsync(Document document);
    Task UpdateAsync(Document document);
    Task DeleteAsync(long documentId);
}
