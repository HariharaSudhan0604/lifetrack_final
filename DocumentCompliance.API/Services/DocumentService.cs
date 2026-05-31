using DocumentCompliance.API.DTOs;
using DocumentCompliance.API.Models;
using DocumentCompliance.API.Repositories.Interfaces;
using DocumentCompliance.API.Services.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Shared.CL.Exceptions;

namespace DocumentCompliance.API.Services;

public class DocumentService : IDocumentService
{
    private readonly IDocumentRepository _repo;
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);
    private const string VersionKey = "documents:list:version";
    private const string ItemPrefix = "documents:item";

    public DocumentService(IDocumentRepository repo, IMemoryCache cache)
    {
        _repo  = repo;
        _cache = cache;
    }

    public async Task<PagedResult<DocumentResponse>> ListAsync(
        long? protocolId, string? status, string? category, int page, int pageSize)
    {
        var v   = GetVersion();
        var key = $"documents:list:v{v}:{protocolId}:{status}:{category}:{page}:{pageSize}";
        if (_cache.TryGetValue(key, out PagedResult<DocumentResponse>? cached) && cached is not null)
            return cached;
        var (items, total) = await _repo.ListAsync(protocolId, status, category, page, pageSize);
        var result = new PagedResult<DocumentResponse>
        {
            Page       = page,
            PageSize   = pageSize,
            TotalCount = total,
            Items      = items.Select(ToResponse).ToList()
        };
        _cache.Set(key, result, CacheDuration);
        return result;
    }

    public async Task<DocumentResponse?> GetAsync(long documentId)
    {
        var key = $"{ItemPrefix}:{documentId}";
        if (_cache.TryGetValue(key, out DocumentResponse? cached) && cached is not null)
            return cached;
        var doc = await _repo.GetByIdAsync(documentId);
        if (doc is null) return null;
        var r = ToResponse(doc);
        _cache.Set(key, r, CacheDuration);
        return r;
    }

    public async Task<DocumentResponse> CreateAsync(CreateDocumentRequest req)
    {
        var doc = new Document
        {
            Title      = req.Title,
            Category   = req.Category,
            ProtocolID = req.ProtocolID,
            Version    = req.Version,
            Notes      = req.Notes,
            UploadedBy = req.UploadedBy,
            UploadedAt = DateTime.UtcNow,
            Status     = "Draft"
        };
        var created = await _repo.AddAsync(doc);
        BumpVersion();
        return ToResponse(created);
    }

    public async Task<DocumentResponse?> UpdateAsync(long documentId, UpdateDocumentRequest req)
    {
        var doc = await _repo.GetByIdAsync(documentId);
        if (doc is null) return null;
        if (doc.Status == "Approved" && req.Status == "Draft")
            throw new DomainException("An approved document cannot be reverted to Draft.");
        doc.Title      = req.Title;
        doc.Category   = req.Category;
        doc.ProtocolID = req.ProtocolID;
        doc.Version    = req.Version;
        doc.Notes      = req.Notes;
        doc.Status     = req.Status;
        doc.UploadedBy = req.UploadedBy;
        await _repo.UpdateAsync(doc);
        Invalidate(documentId);
        return ToResponse(doc);
    }

    private int GetVersion() =>
        _cache.GetOrCreate(VersionKey, e => { e.Priority = CacheItemPriority.NeverRemove; return 0; });

    private void BumpVersion() =>
        _cache.Set(VersionKey, GetVersion() + 1, new MemoryCacheEntryOptions { Priority = CacheItemPriority.NeverRemove });

    private void Invalidate(long id) { _cache.Remove($"{ItemPrefix}:{id}"); BumpVersion(); }

    private static DocumentResponse ToResponse(Document d) =>
        new(d.DocumentID, d.Title, d.Category, d.ProtocolID, d.Version,
            d.UploadedBy, d.UploadedAt, d.Status, d.Notes);
}
