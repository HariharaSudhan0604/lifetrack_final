import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../core/models/auth.models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  form: FormGroup;
  loading   = false;
  error     = '';
  showPass  = false;
  showPass2 = false;
  /** ISO date string used as the [max] attribute on the DOB input (no future dates). */
  readonly today = new Date().toISOString().split('T')[0];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {
    if (this.auth.isLoggedIn()) this.router.navigate(['/dashboard']);

    this.form = this.fb.group(
      {
        name:     ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
        email:    ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
        dob:      ['', [Validators.required]],
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
        confirm:  ['', Validators.required],
        phone:    ['', Validators.maxLength(32)],
      },
      { validators: this.passwordsMatch }
    );
  }

  private passwordsMatch(g: FormGroup) {
    const pw = g.get('password')?.value;
    const c  = g.get('confirm')?.value;
    return pw && c && pw !== c ? { mismatch: true } : null;
  }

  get name()     { return this.form.get('name')!; }
  get email()    { return this.form.get('email')!; }
  get dob()      { return this.form.get('dob')!; }
  get password() { return this.form.get('password')!; }
  get confirm()  { return this.form.get('confirm')!; }

  get confirmError(): string {
    if (!this.confirm.touched) return '';
    if (this.confirm.hasError('required')) return 'Please confirm your password.';
    if (this.form.hasError('mismatch'))    return 'Passwords do not match.';
    return '';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading = true;
    this.error   = '';

    const v = this.form.value;
    const body: any = {
      name:     v.name.trim(),
      email:    v.email.trim(),
      dob:      v.dob,          // ISO date string — backend parses as DateTime
      password: v.password,
    };
    if (v.phone?.trim()) body.phone = v.phone.trim();

    this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register/patient`, body).subscribe({
      next: res => {
        this.auth.handleAuthResponse(res);
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        this.loading = false;
        this.error   =
          err?.error?.error ??
          err?.error?.message ??
          (typeof err?.error === 'string' ? err.error : null) ??
          'Registration failed. This email may already be registered.';
      }
    });
  }

  togglePass()  { this.showPass  = !this.showPass; }
  togglePass2() { this.showPass2 = !this.showPass2; }
}
