using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Notification.API.Data;
using Notification.API.Repositories;
using Notification.API.Repositories.Interfaces;
using Notification.API.Services;
using Notification.API.Services.Interfaces;
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
        Title = "LifeTrack – Notification API",
        Version = "v1",
        Description = "Delivers and manages in-app notifications for LifeTrack users."
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
builder.Services.AddDbContext<NotificationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("GovernanceDb")));

// ── Caching ────────────────────────────────────────────────────────────────
builder.Services.AddMemoryCache();

// ── Application services ───────────────────────────────────────────────────
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<INotificationService, NotificationService>();

var app = builder.Build();

// ── Middleware pipeline ────────────────────────────────────────────────────
app.UseGlobalExceptionHandler(); // must be first — catches everything below

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "LifeTrack – Notification API v1"));
}

// Run migrations manually: dotnet ef database update --project Notification.API

app.MapControllers();

app.Run();
