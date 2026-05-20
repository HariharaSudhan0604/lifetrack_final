import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guards feature routes by an allowed-roles list declared in route data.
 *
 * Usage in route config:
 *   {
 *     path: 'documents',
 *     component: CtmDocumentsPageComponent,
 *     canActivate: [RoleGuard],
 *     data: { roles: ['ClinicalTrialManager', 'RegulatoryOfficer'], title: 'Documents' }
 *   }
 *
 * If the current user's role is not in the list they are redirected to
 * their own role dashboard (via /dashboard) rather than seeing a blank page.
 */
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowed: string[] = route.data?.['roles'] ?? [];
    const userRole = this.auth.currentUser?.role ?? '';

    // No restriction declared → allow all authenticated users
    if (allowed.length === 0) return true;

    if (allowed.includes(userRole)) return true;

    // Not authorised → redirect to role home (RoleHomeComponent resolves the right dashboard)
    this.router.navigate(['/dashboard']);
    return false;
  }
}
