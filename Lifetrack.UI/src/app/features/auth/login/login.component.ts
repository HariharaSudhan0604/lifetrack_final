import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  form: FormGroup;
  loading  = false;
  error    = '';
  showPass = false;

  // ── Rate-limit state ──────────────────────────────────────────────────
  rateLimited   = false;
  rateLimitSecs = 0;

  private readonly RATE_LIMIT_KEY = 'lt_login_rate_limit_until';
  private _expiresAt = 0;
  private _rateLimitTimer: ReturnType<typeof setInterval> | null = null;

  /** MM:SS string shown in the alert and button */
  get rateLimitDisplay(): string {
    const m = Math.floor(this.rateLimitSecs / 60);
    const s = this.rateLimitSecs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    if (this.auth.isLoggedIn()) this.router.navigate(['/dashboard']);
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Resume a previous rate-limit countdown that survived a page refresh
    const stored = localStorage.getItem(this.RATE_LIMIT_KEY);
    if (stored) {
      const expiresAt = +stored;
      if (expiresAt > Date.now()) {
        this._beginCountdown(expiresAt);   // pick up from the real remaining time
      } else {
        localStorage.removeItem(this.RATE_LIMIT_KEY);   // already expired — clean up
      }
    }
  }

  get email()    { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }

  submit(): void {
    if (this.form.invalid || this.rateLimited) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.error   = '';

    this.auth.login(this.form.value).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: err => {
        if (err.status === 429) {
          // Back-end window is 5 minutes — store the expiry so refreshes resume correctly
          const expiresAt = Date.now() + 5 * 60 * 1000;
          localStorage.setItem(this.RATE_LIMIT_KEY, String(expiresAt));
          this._beginCountdown(expiresAt);
        } else {
          this.error =
            err.error?.errors?.[0] ??
            err.error?.message     ??
            err.error?.error       ??
            'Invalid email or password. Please try again.';
        }
      }
    });
  }

  /**
   * Starts (or resumes) the countdown using an absolute expiry timestamp.
   * Each tick recalculates from Date.now() so it never drifts.
   */
  private _beginCountdown(expiresAt: number): void {
    this._expiresAt    = expiresAt;
    this.rateLimited   = true;
    this.rateLimitSecs = Math.ceil((expiresAt - Date.now()) / 1000);
    this.error         = '';
    this._clearTimer();

    this._rateLimitTimer = setInterval(() => {
      const remaining = Math.ceil((this._expiresAt - Date.now()) / 1000);
      if (remaining <= 0) {
        this._clearRateLimit();
      } else {
        this.rateLimitSecs = remaining;
      }
    }, 1000);
  }

  private _clearRateLimit(): void {
    this.rateLimited   = false;
    this.rateLimitSecs = 0;
    this._clearTimer();
    localStorage.removeItem(this.RATE_LIMIT_KEY);
  }

  private _clearTimer(): void {
    if (this._rateLimitTimer !== null) {
      clearInterval(this._rateLimitTimer);
      this._rateLimitTimer = null;
    }
  }

  togglePass(): void { this.showPass = !this.showPass; }

  ngOnDestroy(): void { this._clearTimer(); }
}
