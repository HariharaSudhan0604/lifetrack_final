using System.Text.Json.Serialization;
using DocumentCompliance.API.Data;
using DocumentCompliance.API.Repositories;
using DocumentCompliance.API.Repositories.Interfaces;
using DocumentCompliance.API.Services;
using DocumentCompliance.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Shared.CL.Extensions;
using Shared.CL.Filters;

var builder = WebApplication.CreateBuilder(args);

// ── MVC + shared filters ───────────────────────────────────────────────────
builder.Services.AddControllers(o =>
{
    o.Filters.Add<JwtAuthFilter>();          // JWT Bearer token validation (filter-based)
    o.Filters.Add<ActivityLogFilter>();      // Logs every successful request
    o.Filters.Add<DomainExceptionFilter>();  // DomainException → 400, NotFoundException → 404
    o.Filters.Add<ValidateModelFilter>();    // Invalid ModelState → 422
})
.AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// ── Swagger (Swashbuckle) ─────────────────────────────────────────────────
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "LifeTrack – Document & Compliance API",
        Version = "v1",
        Description = "Manages regulatory documents and compliance tracking for clinical trials."
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token (the 'Bearer ' prefix is added automatically)."
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ── HTTP context accessor (used by DocumentDbContext to stamp changedByUserID on audit rows) ──
builder.Services.AddHttpContextAccessor();

// ── Database ───────────────────────────────────────────────────────────────
builder.Services.AddDbContext<DocumentDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("GovernanceDb")));

// ── Caching ────────────────────────────────────────────────────────────────
builder.Services.AddMemoryCache();

// ── Application services ───────────────────────────────────────────────────
builder.Services.AddScoped<IDocumentRepository, DocumentRepository>();
builder.Services.AddScoped<IDocumentService, DocumentService>();

var app = builder.Build();

// ── Middleware pipeline ────────────────────────────────────────────────────
app.UseGlobalExceptionHandler(); // must be first — catches everything below

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "LifeTrack – Document & Compliance API v1"));
}

// Run migrations manually: dotnet ef database update --project DocumentCompliance.API

app.MapControllers();

app.Run();
