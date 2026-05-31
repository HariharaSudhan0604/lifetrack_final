using System.Security.Claims;
using AdverseEvent.API.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
namespace AdverseEvent.API.Data;

public class AdverseEventDbContext : DbContext
{
    private readonly IHttpContextAccessor? _httpCtx;

    public AdverseEventDbContext(DbContextOptions<AdverseEventDbContext> options,
                                 IHttpContextAccessor? httpCtx = null)
        : base(options)
    {
        _httpCtx = httpCtx;
    }

    public DbSet<AdverseEventRecord> AdverseEvents => Set<AdverseEventRecord>();
    public DbSet<Deviation> Deviations => Set<Deviation>();
    public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();

    /// <summary>Resolves the acting user ID from the JWT claim, or null for system operations.</summary>
    private long? CurrentUserID
    {
        get
        {
            var raw = _httpCtx?.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            return long.TryParse(raw, out var id) ? id : null;
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AdverseEventRecord>(e =>
        {
            e.ToTable("AdverseEvents");
            e.HasKey(x => x.EventID);
            e.Property(x => x.Severity).HasMaxLength(50).IsRequired();
            e.Property(x => x.Status).HasMaxLength(50).IsRequired();
            e.Property(x => x.Description).HasMaxLength(1000).IsRequired();
            e.HasIndex(x => x.PatientID);
            e.HasIndex(x => x.ProtocolID);
            e.HasIndex(x => x.Severity);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.ReportedDate);
        });

        modelBuilder.Entity<Deviation>(e =>
        {
            e.ToTable("Deviations");
            e.HasKey(x => x.DeviationID);
            e.Property(x => x.Severity).HasMaxLength(50).IsRequired();
            e.Property(x => x.Status).HasMaxLength(50).IsRequired();
            e.Property(x => x.Description).HasMaxLength(1000).IsRequired();
            e.HasIndex(x => x.SiteProtocolID);
            e.HasIndex(x => x.Status);
        });

        // AuditEntries table is owned by ProtocolSite.API in ClinicalDb — do not re-create it.
        modelBuilder.Entity<AuditEntry>()
            .ToTable("AuditEntries", t => t.ExcludeFromMigrations());
    }

    public new async Task<int> SaveChangesAsync()
    {
        var changedEntries = ChangeTracker.Entries()
            .Where(e => e.Entity is not AuditEntry &&
                        e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();

        foreach (var entry in changedEntries)
        {
            var action = entry.State switch
            {
                EntityState.Added => "Insert",
                EntityState.Modified => "Update",
                EntityState.Deleted => "Delete",
                _ => "Unknown"
            };
            var pk = entry.Properties
                .FirstOrDefault(p => p.Metadata.IsPrimaryKey())?.CurrentValue?.ToString();

            AuditEntries.Add(new AuditEntry
            {
                EntityName = entry.Entity.GetType().Name,
                PrimaryKey = pk,
                Action = action,
                ChangedByUserID = CurrentUserID,
                ChangedAt = DateTime.UtcNow
            });
        }

        return await base.SaveChangesAsync();
    }
}
