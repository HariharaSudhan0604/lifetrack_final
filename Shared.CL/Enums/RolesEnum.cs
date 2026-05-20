namespace Shared.CL.Enums;

/// <summary>
/// Typed enum representing the six LifeTrack roles.
/// Values mirror the RoleID seed data in Authentication.API/Data/DbSeeder.cs.
/// Use with <see cref="Shared.CL.Filters.RoleAuthorizeAttribute"/> instead of
/// the string-based [Authorize(Roles = "...")] approach.
/// </summary>
public enum RolesEnum
{
    Admin = 1,
    ClinicalTrialManager = 2,
    Investigator = 3,
    Patient = 4,
    RegulatoryOfficer = 5,
    DataManager = 6
}
