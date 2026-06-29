import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { RoleGuard } from '../../core/guards/role.guard';

import { DashboardComponent }              from './dashboard.component';
import { RoleHomeComponent }               from './roles/home/role-home.component';

// ── Admin ─────────────────────────────────────────────────────────────────────
import { AdminDashboardComponent }         from './roles/admin/admin-dashboard.component';
import { AdminUsersPageComponent }         from './roles/admin/pages/admin-users-page.component';
import { AdminProtocolsPageComponent }     from './roles/admin/pages/admin-protocols-page.component';
import { AdminSitesPageComponent }         from './roles/admin/pages/admin-sites-page.component';
import { AdminAssignmentsPageComponent }   from './roles/admin/pages/admin-assignments-page.component';
import { AdminDocumentsPageComponent }     from './roles/admin/pages/admin-documents-page/admin-documents-page.component';
import { AdminReportsPageComponent }       from './roles/admin/pages/admin-reports-page/admin-reports-page.component';
import { AdminAuditLogsPageComponent }     from './roles/admin/pages/admin-audit-logs-page/admin-audit-logs-page.component';

// ── CTM ───────────────────────────────────────────────────────────────────────
import { CtmDashboardComponent }           from './roles/ctm/ctm-dashboard.component';
import { CtmProtocolsPageComponent }       from './roles/ctm/pages/ctm-protocols-page.component';
import { CtmSitesPageComponent }           from './roles/ctm/pages/ctm-sites-page.component';
import { CtmAssignmentsPageComponent }     from './roles/ctm/pages/ctm-assignments-page.component';
import { CtmAdverseEventsPageComponent }   from './roles/ctm/pages/ctm-adverse-events-page/ctm-adverse-events-page.component';
import { CtmDocumentsPageComponent }       from './roles/ctm/pages/ctm-documents-page/ctm-documents-page.component';
import { CtmReportsPageComponent }         from './roles/ctm/pages/ctm-reports-page/ctm-reports-page.component';

// ── Investigator ──────────────────────────────────────────────────────────────
import { InvestigatorDashboardComponent }           from './roles/investigator/investigator-dashboard.component';
import { InvestigatorAssignmentsPageComponent }     from './roles/investigator/pages/assignments/investigator-assignments-page.component';
import { InvestigatorEnrollmentsPageComponent }     from './roles/investigator/pages/investigator-enrollments-page.component';
import { InvestigatorVisitsPageComponent }          from './roles/investigator/pages/investigator-visits-page.component';
import { InvestigatorAdverseEventsPageComponent }   from './roles/investigator/pages/investigator-adverse-events-page/investigator-adverse-events-page.component';
import { InvestigatorDeviationsPageComponent }      from './roles/investigator/pages/investigator-deviations-page/investigator-deviations-page.component';

// ── Other roles ───────────────────────────────────────────────────────────────
import { DataManagerDashboardComponent }   from './roles/data-manager/data-manager-dashboard.component';
import { RegulatoryDashboardComponent }    from './roles/regulatory/regulatory-dashboard.component';
import { PatientDashboardComponent }       from './roles/patient/patient-dashboard.component';
import { PatientEnrollmentsPageComponent } from './roles/patient/pages/patient-enrollments-page.component';
import { PatientVisitsPageComponent }      from './roles/patient/pages/patient-visits-page.component';
import { PatientSymptomsPageComponent }    from './roles/patient/pages/patient-symptoms-page.component';
import { NotificationsPageComponent }      from './pages/notifications-page/notifications-page.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      { path: '',  component: RoleHomeComponent, pathMatch: 'full' },

      // ── Role dashboards (role prefix is correct here — each is role-specific) ──
      { path: 'admin',        component: AdminDashboardComponent,       data: { title: 'Dashboard' } },
      { path: 'ctm',          component: CtmDashboardComponent,         data: { title: 'Dashboard' } },
      { path: 'investigator', component: InvestigatorDashboardComponent, data: { title: 'Dashboard' } },
      { path: 'data-manager', component: DataManagerDashboardComponent, data: { title: 'Dashboard' } },
      { path: 'regulatory',   component: RegulatoryDashboardComponent,  data: { title: 'Dashboard' } },
      { path: 'patient',      component: PatientDashboardComponent,     data: { title: 'My Trial' } },
      {
        path: 'notifications',
        component: NotificationsPageComponent,
        data: { title: 'Notifications' }
      },
      {
        path: 'patient/enrollments',
        component: PatientEnrollmentsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'My Enrollments', roles: ['Patient'] }
      },
      {
        path: 'patient/visits',
        component: PatientVisitsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'My Visits', roles: ['Patient'] }
      },
      {
        path: 'patient/symptoms',
        component: PatientSymptomsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'My Reported Symptoms', roles: ['Patient'] }
      },

      // ── Admin-exclusive pages (Admin owns full CRUD — kept under /admin/) ────
      {
        path: 'admin/users',
        component: AdminUsersPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'User Management', roles: ['Admin'] }
      },
      {
        path: 'admin/protocols',
        component: AdminProtocolsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'Protocols', roles: ['Admin'] }
      },
      {
        path: 'admin/sites',
        component: AdminSitesPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'Sites', roles: ['Admin'] }
      },
      {
        path: 'admin/assignments',
        component: AdminAssignmentsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'Assignments', roles: ['Admin'] }
      },
      {
        path: 'admin/documents',
        component: AdminDocumentsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'Documents', roles: ['Admin'] }
      },
      {
        path: 'admin/reports',
        component: AdminReportsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'KPI Reports', roles: ['Admin'] }
      },

      // ── Shared feature pages (no role prefix — URL describes the feature, not the role) ──
      {
        path: 'protocols',
        component: CtmProtocolsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'Protocols', roles: ['ClinicalTrialManager', 'RegulatoryOfficer'] }
      },
      {
        path: 'sites',
        component: CtmSitesPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'Sites', roles: ['ClinicalTrialManager'] }
      },
      {
        path: 'assignments',
        component: CtmAssignmentsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'Assignments', roles: ['ClinicalTrialManager'] }
      },
      {
        path: 'documents',
        component: CtmDocumentsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'Documents', roles: ['ClinicalTrialManager', 'RegulatoryOfficer', 'DataManager'] }
      },
      {
        path: 'reports',
        component: CtmReportsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'KPI Reports', roles: ['ClinicalTrialManager', 'DataManager', 'RegulatoryOfficer'] }
      },
      {
        path: 'adverse-events',
        component: CtmAdverseEventsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'Adverse Events', roles: ['ClinicalTrialManager', 'Investigator', 'DataManager', 'RegulatoryOfficer'] }
      },
      {
        path: 'audit-logs',
        component: AdminAuditLogsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'Audit Logs', roles: ['Admin', 'RegulatoryOfficer'] }
      },
      {
        path: 'my-assignments',
        component: InvestigatorAssignmentsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'My Assignments', roles: ['Investigator'] }
      },
      {
        path: 'enrollments',
        component: InvestigatorEnrollmentsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'Enrollments', roles: ['Investigator', 'DataManager'] }
      },
      {
        path: 'visits',
        component: InvestigatorVisitsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'Visits', roles: ['Investigator'] }
      },
      {
        path: 'deviations',
        component: InvestigatorDeviationsPageComponent,
        canActivate: [RoleGuard],
        data: { title: 'Protocol Deviations', roles: ['Investigator', 'DataManager', 'RegulatoryOfficer', 'ClinicalTrialManager'] }
      },
    ]
  }
];

@NgModule({
  declarations: [
    DashboardComponent,
    RoleHomeComponent,
    // Admin
    AdminDashboardComponent,
    AdminUsersPageComponent,
    AdminProtocolsPageComponent,
    AdminSitesPageComponent,
    AdminAssignmentsPageComponent,
    AdminDocumentsPageComponent,
    AdminReportsPageComponent,
    AdminAuditLogsPageComponent,
    // CTM
    CtmDashboardComponent,
    CtmProtocolsPageComponent,
    CtmSitesPageComponent,
    CtmAssignmentsPageComponent,
    CtmAdverseEventsPageComponent,
    CtmDocumentsPageComponent,
    CtmReportsPageComponent,
    // Investigator
    InvestigatorDashboardComponent,
    InvestigatorAssignmentsPageComponent,
    InvestigatorEnrollmentsPageComponent,
    InvestigatorVisitsPageComponent,
    InvestigatorAdverseEventsPageComponent,
    InvestigatorDeviationsPageComponent,
    // Other roles
    DataManagerDashboardComponent,
    RegulatoryDashboardComponent,
    PatientDashboardComponent,
    PatientEnrollmentsPageComponent,
    PatientVisitsPageComponent,
    PatientSymptomsPageComponent,
    NotificationsPageComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class DashboardModule {}
