using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using ProtocolSite.API.Data;
using ProtocolSite.API.Repositories;
using ProtocolSite.API.Repositories.Interfaces;
using ProtocolSite.API.Services;
using ProtocolSite.API.Services.Interfaces;
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
        Title = "LifeTrack – Protocol & Site API",
        Version = "v1",
        Description = "Manages clinical trial protocols and investigator site records."
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

// ── Caching ────────────────────────────────────────────────────────────────
builder.Services.AddMemoryCache();

// ── Database ───────────────────────────────────────────────────────────────
builder.Services.AddDbContext<ProtocolSiteDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("ClinicalDb")));

// ── Application services ───────────────────────────────────────────────────
builder.Services.AddScoped<IProtocolRepository, ProtocolRepository>();
builder.Services.AddScoped<ISiteRepository, SiteRepository>();
builder.Services.AddScoped<ISiteProtocolRepository, SiteProtocolRepository>();
builder.Services.AddScoped<IProtocolService, ProtocolService>();
builder.Services.AddScoped<ISiteService, SiteService>();
builder.Services.AddScoped<ISiteProtocolService, SiteProtocolService>();

var app = builder.Build();

// ── Middleware pipeline ────────────────────────────────────────────────────
app.UseGlobalExceptionHandler(); // must be first — catches everything below

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "LifeTrack – Protocol & Site API v1"));
}

// Run migrations manually: dotnet ef database update --project ProtocolSite.API

app.MapControllers();

app.Run();
