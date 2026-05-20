import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { UserInfo } from '../../../../core/models/auth.models';
import { DashboardService } from '../../../../core/services/dashboard.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: false,
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  user: UserInfo | null;

  // ── Dashboard stats ───────────────────────────────────────────────────────
  users = 0; protocols = 0; patients = 0; sites = 0;
  recentAEs: any[] = [];
  loading = true;

  // ── AE Detail Modal ───────────────────────────────────────────────────────
  selectedAE: any = null;
  showAEModal = false;

  constructor(
    private auth: AuthService,
    private ds: DashboardService,
    private router: Router
  ) {
    this.user = this.auth.currentUser;
  }

  ngOnInit() {
    forkJoin({
      users:     this.ds.count('users'),
      protocols: this.ds.count('protocols'),
      patients:  this.ds.count('patients'),
      sites:     this.ds.count('sites'),
      recentAEs: this.ds.list<any>('adverse-events'),
    }).subscribe(d => {
      this.users     = d.users;
      this.protocols = d.protocols;
      this.patients  = d.patients;
      this.sites     = d.sites;
      this.recentAEs = d.recentAEs;
      this.loading   = false;
    });
  }

  get firstName() { return this.user?.name?.split(' ')[0] ?? this.user?.name; }

  manageUsers()        { this.router.navigate(['/dashboard/admin/users']); }
  manageProtocols()    { this.router.navigate(['/dashboard/admin/protocols']); }
  manageSites()        { this.router.navigate(['/dashboard/admin/sites']); }
  manageAssignments()  { this.router.navigate(['/dashboard/admin/assignments']); }
  manageDocuments()    { this.router.navigate(['/dashboard/admin/documents']); }
  manageReports()      { this.router.navigate(['/dashboard/admin/reports']); }
  manageAuditLogs()    { this.router.navigate(['/dashboard/audit-logs']); }

  // ── AE Detail Modal helpers ───────────────────────────────────────────────
  openAEDetail(ae: any): void {
    this.selectedAE  = ae;
    this.showAEModal = true;
  }
  closeAEModal(): void {
    this.showAEModal = false;
    this.selectedAE  = null;
  }

  // ── Badge / display helpers ───────────────────────────────────────────────
  severityClass(s: string): string {
    const m: Record<string, string> = {
      Critical: 'badge-red', Severe: 'badge-red',
      Moderate: 'badge-amber', Mild: 'badge-green'
    };
    return m[s] ?? 'badge-slate';
  }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      Open: 'badge-red', 'Under Review': 'badge-amber', Resolved: 'badge-green'
    };
    return m[s] ?? 'badge-slate';
  }
}
