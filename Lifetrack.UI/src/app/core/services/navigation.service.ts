import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Tracks the previous route so that any page component can navigate back
 * to wherever the user actually came from — regardless of which role's
 * dashboard initiated the navigation.
 *
 * Usage in a page component:
 *   constructor(private nav: NavigationService) {}
 *   goBack() { this.nav.back('/dashboard/ctm'); }   // fallback for direct URL access
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private _previousUrl: string = '/dashboard';
  private _currentUrl:  string = '';

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const next: string = (e as NavigationEnd).urlAfterRedirects;
        if (next !== this._currentUrl) {
          this._previousUrl = this._currentUrl || '/dashboard';
          this._currentUrl  = next;
        }
      });
  }

  /** The URL the user was on before the current page. */
  get previousUrl(): string { return this._previousUrl; }

  /**
   * Navigate back to the previous page.
   * @param fallback  Used when no previous URL is recorded (e.g. direct link / page refresh).
   */
  back(fallback: string = '/dashboard'): void {
    const dest = this._previousUrl || fallback;
    this.router.navigate([dest]);
  }
}
