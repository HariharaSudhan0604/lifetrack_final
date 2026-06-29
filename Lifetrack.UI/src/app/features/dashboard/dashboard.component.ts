import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserInfo } from '../../core/models/auth.models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  user: UserInfo | null;

  // ── Change Password Modal ──────────────────────────────────────────────────
  showCPModal  = false;
  cpForm!: FormGroup;
  cpSubmitting = false;
  cpSuccess    = false;
  cpError      = '';
  showCurrent  = false;
  showNew      = false;
  showConfirm  = false;

  constructor(
    private auth: AuthService,
    private http: HttpClient,
    private fb: FormBuilder
  ) {
    this.user = this.auth.currentUser;

    //change pass form
    this.cpForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword:     ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordsMatch }
    );
  }

  private passwordsMatch(g: FormGroup) {
    const np = g.get('newPassword')?.value;
    const cp = g.get('confirmPassword')?.value;
    return np && cp && np !== cp ? { mismatch: true } : null;
  }

  // ── Modal control ──────────────────────────────────────────────────────────
  openCPModal() {
    this.cpForm.reset();
    this.cpError   = '';
    this.cpSuccess = false;
    this.showCurrent = this.showNew = this.showConfirm = false;
    this.showCPModal = true;
  }

  closeCPModal() {
    if (this.cpSubmitting) return;
    this.showCPModal = false;
  }

  onBackdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('cp-backdrop')) this.closeCPModal();
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  submitCP() {
    if (this.cpForm.invalid) { this.cpForm.markAllAsTouched(); return; }

    this.cpSubmitting = true;
    this.cpError      = '';

    const v = this.cpForm.value;
    this.http.post(`${environment.apiUrl}/auth/change-password`, {
      currentPassword: v.currentPassword,
      newPassword:     v.newPassword
    }).subscribe({
      next: () => {
        this.cpSubmitting = false;
        this.cpSuccess    = true;
        setTimeout(() => {
          this.showCPModal = false;
          this.cpSuccess   = false;
        }, 2000);
      },
      error: err => {
        this.cpSubmitting = false;
        this.cpError =
          err?.error?.error ??
          err?.error?.message ??
          (typeof err?.error === 'string' ? err.error : null) ??
          'Failed to change password. Please try again.';
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  get initial(): string {
    return this.user?.name?.charAt(0)?.toUpperCase() ?? '?';
  }

  get roleColor(): string {
    const map: Record<string, string> = {
      'Admin':                '#7c3aed',
      'ClinicalTrialManager': '#0f3460',
      'Investigator':         '#0891b2',
      'Patient':              '#059669',
      'RegulatoryOfficer':    '#d97706',
      'DataManager':          '#dc2626'
    };
    return map[this.user?.role ?? ''] ?? '#64748b';
  }

  cf(n: string) { return this.cpForm.get(n)!; }

  fieldErr(name: string): string {
    const c = this.cf(name);
    if (!c.touched || c.valid) return '';
    if (c.errors?.['required'])  return 'This field is required.';
    if (c.errors?.['minlength']) return `Minimum ${c.errors['minlength'].requiredLength} characters.`;
    return 'Invalid value.';
  }

  get confirmErr(): string {
    const c = this.cf('confirmPassword');
    if (!c.touched) return '';
    if (c.errors?.['required'])          return 'Please confirm your new password.';
    if (this.cpForm.errors?.['mismatch']) return 'Passwords do not match.';
    return '';
  }

  logout(): void { this.auth.logout(); }
}
