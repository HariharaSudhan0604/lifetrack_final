using System.Security.Claims;
using DocumentCompliance.API.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
namespace DocumentCompliance.API.Data;

public class DocumentDbContext : DbContext
{
    private readonly IHttpContextAccessor? _httpCtx;

    public DocumentDbContext(DbContextOptions<DocumentDbContext> options,
                             IHttpContextAccessor? httpCtx = null)
        : base(options)
    {
        _httpCtx = httpCtx;
    }

    public DbSet<Document> Documents => Set<Document>();
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

        modelBuilder.Entity<Document>(e =>
        {
            e.ToTable("Documents");
            e.HasKey(d => d.DocumentID);
            e.Property(d => d.Title).HasMaxLength(300).IsRequired();
            e.Property(d => d.Category).HasMaxLength(100).IsRequired();
            e.Property(d => d.Version).HasMaxLength(20).IsRequired();
            e.Property(d => d.Status).HasMaxLength(50).IsRequired();
            e.Property(d => d.Notes).HasMaxLength(1000);
            e.HasIndex(d => d.ProtocolID);
            e.HasIndex(d => d.Category);
            e.HasIndex(d => d.Status);
            e.HasIndex(d => d.UploadedBy);
            e.HasIndex(d => d.UploadedAt);
        });

        // AuditEntries table is owned by Authentication.API in GovernanceDb — do not re-create it.
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
