namespace ProtocolSite.API.Enums;

// Mirrors Authentication.API.Enums.UserRole. Kept here so [Authorize(Roles = ...)]
// attributes don't take a hard dependency on the auth project.
public enum UserRole
{
    Admin,
    ClinicalTrialManager,
    Investigator,
    Patient,
    RegulatoryOfficer,
    DataManager
}
