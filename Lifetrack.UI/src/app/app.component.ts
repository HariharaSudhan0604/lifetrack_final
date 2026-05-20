import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';

/** Maps the role string stored in the JWT to a human-readable label. */
const ROLE_LABELS: Record<string, string> = {
  Admin:                'Admin',
  ClinicalTrialManager: 'Clinical Trial Manager',
  Investigator:         'Investigator',
  RegulatoryOfficer:    'Regulatory Officer',
  DataManager:          'Data Manager',
  Patient:              'Patient',
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'Lifetrack.UI';

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        // Walk down to the deepest active child route
        let route = this.activatedRoute;
        while (route.firstChild) route = route.firstChild;

        const pageTitle  = route.snapshot.data?.['title'] as string | undefined;
        const role       = this.auth.currentUser?.role;
        const roleLabel  = role ? ROLE_LABELS[role] : undefined;

        if (pageTitle && roleLabel) {
          // e.g. "Documents – Regulatory Officer | LifeTrack"
          this.titleService.setTitle(`${pageTitle} – ${roleLabel} | LifeTrack`);
        } else if (pageTitle) {
          // Auth pages (no session yet): "Sign In | LifeTrack"
          this.titleService.setTitle(`${pageTitle} | LifeTrack`);
        } else {
          this.titleService.setTitle('LifeTrack');
        }
      });
  }
}
