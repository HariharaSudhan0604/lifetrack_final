using System.Text.Json.Serialization;
using AdverseEvent.API.Data;
using AdverseEvent.API.Repositories;
using AdverseEvent.API.Repositories.Interfaces;
using AdverseEvent.API.Services;
using AdverseEvent.API.Services.Interfaces;
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
        Title = "LifeTrack – Adverse Event API",
        Version = "v1",
        Description = "Records and tracks adverse events and protocol deviations in clinical trials."
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

// ── Database ───────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AdverseEventDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("ClinicalDb")));

// ── Caching ────────────────────────────────────────────────────────────────
builder.Services.AddMemoryCache();

// ── Application services ───────────────────────────────────────────────────
builder.Services.AddScoped<IAdverseEventRepository, AdverseEventRepository>();
builder.Services.AddScoped<IDeviationRepository, DeviationRepository>();
builder.Services.AddScoped<IAdverseEventService, AdverseEventService>();
builder.Services.AddScoped<IDeviationService, DeviationService>();

var app = builder.Build();

// ── Middleware pipeline ────────────────────────────────────────────────────
app.UseGlobalExceptionHandler(); // must be first — catches everything below

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "LifeTrack – Adverse Event API v1"));
}

// Run migrations manually: dotnet ef database update --project AdverseEvent.API

app.MapControllers();

app.Run();
