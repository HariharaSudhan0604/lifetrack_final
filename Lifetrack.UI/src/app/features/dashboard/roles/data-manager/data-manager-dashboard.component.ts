import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { UserInfo } from '../../../../core/models/auth.models';
import { DashboardService } from '../../../../core/services/dashboard.service';

@Component({
  selector: 'app-data-manager-dashboard',
  standalone: false,
  templateUrl: './data-manager-dashboard.component.html',
  styleUrls: ['./data-manager-dashboard.component.css']
})
export class DataManagerDashboardComponent implements OnInit {
  user: UserInfo | null;

  // ── Stats ─────────────────────────────────────────────────────────────────
  openAEs    = 0;
  deviations = 0;
  draftDocs  = 0;
  kpiReports = 0;

  // ── Data panels ───────────────────────────────────────────────────────────
  openAEList:   any[] = [];
  recentDeviations: any[] = [];
  loading = true;

  constructor(
    private auth: AuthService,
    private ds: DashboardService,
    private router: Router
  ) {
    this.user = this.auth.currentUser;
  }

  ngOnInit() {
    forkJoin({
      openAEs:    this.ds.count('adverse-events', { status: 'Open' }),
      deviations: this.ds.count('deviations'),
      draftDocs:  this.ds.count('documents', { status: 'Draft' }),
      kpiReports: this.ds.count('kpi-reports'),
      openAEList: this.ds.list<any>('adverse-events', { status: 'Open' }),
      recentDeviations: this.ds.list<any>('deviations'),
    }).subscribe(d => {
      this.openAEs    = d.openAEs;
      this.deviations = d.deviations;
      this.draftDocs  = d.draftDocs;
      this.kpiReports = d.kpiReports;
      this.openAEList = d.openAEList;
      this.recentDeviations = d.recentDeviations;
      this.loading    = false;
    });
  }

  get firstName() { return this.user?.name?.split(' ')[0] ?? this.user?.name; }

  // ── Quick Actions ─────────────────────────────────────────────────────────
  viewAdverseEvents() { this.router.navigate(['/dashboard/adverse-events']); }
  viewDeviations()    { this.router.navigate(['/dashboard/deviations']); }
  viewEnrollments()   { this.router.navigate(['/dashboard/enrollments']); }
  viewReports()       { this.router.navigate(['/dashboard/reports']); }

  // ── Badge helpers ─────────────────────────────────────────────────────────
  aeSeverityClass(s: string): string {
    const m: Record<string, string> = {
      'Life-Threatening': 'badge-red', Severe: 'badge-red',
      Moderate: 'badge-amber', Mild: 'badge-green'
    };
    return m[s] ?? 'badge-slate';
  }

  aeStatusClass(s: string): string {
    const m: Record<string, string> = {
      Open: 'badge-red', 'Under Review': 'badge-amber',
      Resolved: 'badge-green', Closed: 'badge-slate'
    };
    return m[s] ?? 'badge-slate';
  }

  devSeverityClass(s: string): string {
    const m: Record<string, string> = {
      Critical: 'badge-red', Major: 'badge-red',
      Minor: 'badge-amber', Administrative: 'badge-blue'
    };
    return m[s] ?? 'badge-slate';
  }

  devStatusClass(s: string): string {
    const m: Record<string, string> = {
      Open: 'badge-red', 'Under Review': 'badge-amber', Resolved: 'badge-green'
    };
    return m[s] ?? 'badge-slate';
  }
}
