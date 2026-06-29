import { Component } from '@angular/core';
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
export class LoginComponent {
  form: FormGroup;
  loading  = false;
  error    = '';
  showPass = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
      // If already logged in, skip the login page
    if (this.auth.isLoggedIn()) this.router.navigate(['/dashboard']);
    // fb.group() creates the FormGroup with two FormControls inside
    // Each key (email, password) maps to a control name
    // First array item = initial value (empty string)
    // Second array item = array of Validators to apply synchronously

    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }
  // Convenience getters — instead of this.form.get('email') everywhere,
  // you just write this.email in the TS and email in the template
  get email()    { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }

  submit(): void {
    // If any control is invalid, mark all as touched so errors show,
    // then stop — don't call the API with bad data

    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.error   = '';

    this.auth.login(this.form.value).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: err => {
        this.error =
          err.error?.errors?.[0] ??
          err.error?.message     ??
          err.error?.error       ??
          'Invalid email or password. Please try again.';
      }
    });
  }

  togglePass(): void { this.showPass = !this.showPass; }
}
