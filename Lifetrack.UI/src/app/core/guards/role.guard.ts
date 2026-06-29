import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Usage in route config:
 *   {
 *     path: 'documents',
 *     component: CtmDocumentsPageComponent,
 *     canActivate: [RoleGuard],
 *     data: { roles: ['ClinicalTrialManager', 'RegulatoryOfficer'], title: 'Documents' }
 *   }
 *
 * The role is read from the JWT payload, not localstorage to avoid 
 * Backend authorization is still the ultimate source of truth — this guard
 * just prevents the wrong UI from rendering for the wrong role.
 */
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    // Not logged in (or token expired) → kick to login
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    const allowed: string[] = route.data?.['roles'] ?? [];

    // No restriction declared → allow all authenticated users
    if (allowed.length === 0) return true;

    const tokenRole = this.auth.getRoleFromToken();
    const userRole  = tokenRole ?? this.auth.currentUser?.role ?? '';

    if (allowed.includes(userRole)) return true;

    // Not authorised → redirect to role home
    this.router.navigate(['/dashboard']);
    return false;
  }
}
