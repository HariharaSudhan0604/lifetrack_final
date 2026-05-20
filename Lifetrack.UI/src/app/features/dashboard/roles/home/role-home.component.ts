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
