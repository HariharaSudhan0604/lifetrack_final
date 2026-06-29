using Microsoft.Extensions.Caching.Memory;
using ProtocolSite.API.DTOs;
using ProtocolSite.API.Models;
using ProtocolSite.API.Repositories.Interfaces;
using ProtocolSite.API.Services.Interfaces;
using Shared.CL.Exceptions;
namespace ProtocolSite.API.Services;

public class SiteProtocolService : ISiteProtocolService
{
    private readonly ISiteProtocolRepository _repo;
    private readonly ISiteRepository _sites;
    private readonly IProtocolRepository _protocols;
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);
    private const string VersionKey = "siteprotocols:list:version";
    private const string ItemPrefix = "siteprotocols:item";

    public SiteProtocolService(ISiteProtocolRepository repo, ISiteRepository sites, IProtocolRepository protocols, IMemoryCache cache)
    { _repo = repo; _sites = sites; _protocols = protocols; _cache = cache; }

    public async Task<SiteProtocolResponse?> GetAsync(long id)
    {
        var key = $"{ItemPrefix}:{id}";
        if (_cache.TryGetValue(key, out SiteProtocolResponse? cached) && cached is not null) return cached;
        var sp = await _repo.GetByIdAsync(id); if (sp is null) return null;
        var r = Map(sp); _cache.Set(key, r, CacheDuration); return r;
    }

    public async Task<PagedResult<SiteProtocolResponse>> ListAsync(long? siteId, long? protocolId, long? investigatorId, string? status, int page, int pageSize)
    {
        var v = GetVersion(); var key = $"siteprotocols:list:v{v}:{siteId}:{protocolId}:{investigatorId}:{status}:{page}:{pageSize}";
        if (_cache.TryGetValue(key, out PagedResult<SiteProtocolResponse>? cached) && cached is not null) return cached;
        var (items, total) = await _repo.ListAsync(siteId, protocolId, investigatorId, status, page, pageSize);
        var result = new PagedResult<SiteProtocolResponse> { Page = page, PageSize = pageSize, TotalCount = total, Items = items.Select(Map).ToList() };
        _cache.Set(key, result, CacheDuration); return result;
    }

    public async Task<SiteProtocolResponse> CreateAsync(CreateSiteProtocolRequest req)
    {
        var site = await _sites.GetByIdAsync(req.SiteID)
            ?? throw new DomainException($"Site {req.SiteID} not found.");

        if (site.Status != "Active")
            throw new DomainException(
                $"Site '{site.Name}' is currently {site.Status}. Only Active sites can be assigned to protocols.");

        var protocol = await _protocols.GetByIdAsync(req.ProtocolID)
            ?? throw new DomainException($"Protocol {req.ProtocolID} not found.");

        if (protocol.Status != "Active")
            throw new DomainException(
                $"Protocol '{protocol.Title}' is currently {protocol.Status}. Only Active protocols can accept new site assignments.");

        if (req.InvestigatorID.HasValue &&
            await _repo.ExistsAsync(req.ProtocolID, req.SiteID, req.InvestigatorID.Value))
            throw new DomainException(
                "This investigator is already assigned to the same protocol and site combination.");

        if (req.InitiationDate.HasValue)
            ValidateInitiationDate(req.InitiationDate.Value, protocol);

        var sp = new SiteProtocol { SiteID = req.SiteID, ProtocolID = req.ProtocolID, InvestigatorID = req.InvestigatorID, InitiationDate = req.InitiationDate, Phase = req.Phase, Status = req.Status };
        await _repo.AddAsync(sp); BumpVersion(); return Map(sp);
    }

    public async Task<SiteProtocolResponse?> UpdateAsync(long id, UpdateSiteProtocolRequest req)
    {
        var sp = await _repo.GetByIdAsync(id); if (sp is null) return null;

        if (req.InvestigatorID.HasValue &&
            await _repo.ExistsAsync(sp.ProtocolID, sp.SiteID, req.InvestigatorID.Value, excludeId: id))
            throw new DomainException(
                "This investigator is already assigned to the same protocol and site combination.");

        if (req.InitiationDate.HasValue)
        {
            var protocol = await _protocols.GetByIdAsync(sp.ProtocolID);
            if (protocol is not null) ValidateInitiationDate(req.InitiationDate.Value, protocol);
        }

        sp.InvestigatorID = req.InvestigatorID; sp.InitiationDate = req.InitiationDate; sp.Phase = req.Phase; sp.Status = req.Status;
        await _repo.UpdateAsync(sp); Invalidate(id); return Map(sp);
    }

    private static void ValidateInitiationDate(DateTime initiationDate, Protocol protocol)
    {
        var date = initiationDate.Date;

        if (date < protocol.StartDate.Date)
            throw new DomainException(
                $"Initiation date must be on or after the protocol start date ({protocol.StartDate:MMM d, yyyy}).");

        if (protocol.EndDate.HasValue && date > protocol.EndDate.Value.Date)
            throw new DomainException(
                $"Initiation date must be on or before the protocol end date ({protocol.EndDate.Value:MMM d, yyyy}).");
    }

    private int GetVersion() => _cache.GetOrCreate(VersionKey, e => { e.Priority = CacheItemPriority.NeverRemove; return 0; });
    private void BumpVersion() => _cache.Set(VersionKey, GetVersion() + 1, new MemoryCacheEntryOptions { Priority = CacheItemPriority.NeverRemove });
    private void Invalidate(long id) { _cache.Remove($"{ItemPrefix}:{id}"); BumpVersion(); }

    private static SiteProtocolResponse Map(SiteProtocol sp) => new() { SiteProtocolID = sp.SiteProtocolID, SiteID = sp.SiteID, ProtocolID = sp.ProtocolID, InvestigatorID = sp.InvestigatorID, InitiationDate = sp.InitiationDate, Phase = sp.Phase, Status = sp.Status };
}
