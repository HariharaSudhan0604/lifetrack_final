using System.Text.Json.Serialization;
using AnalyticsReport.API.Data;
using AnalyticsReport.API.Repositories;
using AnalyticsReport.API.Repositories.Interfaces;
using AnalyticsReport.API.Services;
using AnalyticsReport.API.Services.Interfaces;
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
        Title = "LifeTrack – Analytics & Reports API",
        Version = "v1",
        Description = "Provides KPI reports and analytics dashboards for clinical trial data."
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
builder.Services.AddDbContext<AnalyticsDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("ClinicalDb")));

// ── Caching ────────────────────────────────────────────────────────────────
builder.Services.AddMemoryCache();

// ── Application services ───────────────────────────────────────────────────
builder.Services.AddScoped<IKpiReportRepository, KpiReportRepository>();
builder.Services.AddScoped<IKpiReportService, KpiReportService>();

var app = builder.Build();

// ── Middleware pipeline ────────────────────────────────────────────────────
app.UseGlobalExceptionHandler(); // must be first — catches everything below

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "LifeTrack – Analytics & Reports API v1"));
}

// Run migrations manually: dotnet ef database update --project AnalyticsReport.API

app.MapControllers();

app.Run();
