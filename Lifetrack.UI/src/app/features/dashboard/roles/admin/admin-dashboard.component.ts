import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { UserInfo } from '../../../../core/models/auth.models';
import { DashboardService } from '../../../../core/services/dashboard.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: false,
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  user: UserInfo | null;

  today = new Date();

  // ── Dashboard stats ───────────────────────────────────────────────────────
  users = 0; protocols = 0; activeProtocols = 0; patients = 0; sites = 0; activeSites = 0;
  recentAuditLogs: any[] = [];
  recentUsers: any[] = [];
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
      users:           this.ds.count('users'),
      protocols:       this.ds.count('protocols'),
      activeProtocols: this.ds.count('protocols', { status: 'Active' }),
      patients:        this.ds.count('patients'),
      sites:           this.ds.count('sites'),
      activeSites:     this.ds.count('sites', { status: 'Active' }),
      recentAuditLogs: this.ds.list<any>('audit-logs'),
      recentUsers:     this.ds.list<any>('users'),
    }).pipe(takeUntil(this.destroy$)).subscribe(d => {
      this.users           = d.users;
      this.protocols       = d.protocols;
      this.activeProtocols = d.activeProtocols;
      this.patients        = d.patients;
      this.sites           = d.sites;
      this.activeSites     = d.activeSites;
      this.recentAuditLogs = d.recentAuditLogs;
      this.recentUsers     = d.recentUsers;
      this.loading         = false;
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

  // ── Badge / display helpers ───────────────────────────────────────────────

  /** Coloured pill for an audit log action string. */
  actionClass(action: string): string {
    if (!action) return 'badge-slate';
    if (action.startsWith('BLOCKED_')) return 'badge-red';
    const m: Record<string, string> = {
      USER_LOGIN:       'badge-green',
      USER_REGISTERED:  'badge-blue',
      USER_UPDATED:     'badge-amber',
      USER_DELETED:     'badge-red',
      USER_REACTIVATED: 'badge-green',
      PASSWORD_CHANGED: 'badge-amber',
    };
    return m[action] ?? 'badge-slate';
  }

  get filteredUsers(): any[] {
    return this.recentUsers.slice(0, 6);
  }

  /** Count of active users in the fetched list. */
  get activeUsersInList(): number {
    return this.recentUsers.filter(u => u.isActive).length;
  }

  /** Coloured pill class for a user's role. */
  roleClass(role: string): string {
    const m: Record<string, string> = {
      Admin:        'badge-purple',
      Investigator: 'badge-green',
      CTM:          'badge-blue',
      'Trial Manager': 'badge-blue',
      Regulatory:   'badge-purple',
      'Regulatory Officer': 'badge-purple',
      'Data Manager': 'badge-amber',
      Patient:      'badge-cyan'
    };
    return m[role] ?? 'badge-slate';
  }

  /** Coloured pill class for a user's status. */
  userStatusClass(s: string): string {
    const m: Record<string, string> = {
      Active: 'badge-green', Pending: 'badge-amber',
      Suspended: 'badge-red', Inactive: 'badge-slate'
    };
    return m[s] ?? 'badge-slate';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
