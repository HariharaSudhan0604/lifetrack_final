//programmatic navigation based on user role after login

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

const ROLE_ROUTES: Record<string, string> = {
  Admin:                '/dashboard/admin',
  ClinicalTrialManager: '/dashboard/ctm',
  Investigator:         '/dashboard/investigator',
  DataManager:          '/dashboard/data-manager',
  RegulatoryOfficer:    '/dashboard/regulatory',
  Patient:              '/dashboard/patient',
};

@Component({
  selector: 'app-role-home',
  standalone: false,
  template: ''
})
export class RoleHomeComponent implements OnInit {
  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    const role = this.auth.currentUser?.role ?? '';
    const target = ROLE_ROUTES[role];
    if (target) {
      this.router.navigate([target], { replaceUrl: true });
    }
  }
}


// // All the ways you navigate programmatically in your project

// // Simple absolute path
// this.router.navigate(['/dashboard/ctm']);

// // With replaceUrl — replaces current history entry instead of adding
// this.router.navigate(['/dashboard/ctm'], { replaceUrl: true });

// // Relative navigation (from within a child route)
// this.router.navigate(['adverse-events'], { relativeTo: this.route });

// // With query parameters (not used in your project but common)
// this.router.navigate(['/dashboard/protocols'], {
//   queryParams: { status: 'Active', page: '2' }
// });
// // → navigates to /dashboard/protocols?status=Active&page=2

// // Back navigation — your NavigationService wraps this
// this.router.navigate([this.nav.previousUrl]);
