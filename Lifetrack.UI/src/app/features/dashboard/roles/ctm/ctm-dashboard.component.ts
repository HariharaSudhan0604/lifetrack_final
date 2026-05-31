import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { catchError, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import { UserInfo } from '../../../../core/models/auth.models';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-ctm-dashboard',
  standalone: false,
  templateUrl: './ctm-dashboard.component.html',
  styleUrls: ['./ctm-dashboard.component.css']
})
export class CtmDashboardComponent implements OnInit, OnDestroy {
  user: UserInfo | null;
  private destroy$ = new Subject<void>();

  today = new Date();

  protocols = 0; activeEnrollments = 0; aeCount = 0; deviationCount = 0;
  recentProtocols: any[] = [];
  recentAEs: any[] = [];
  recentDeviations: any[] = [];
  loading = true;

  // ── Notifications ──────────────────────────────────────────────────────────
  notifications:  any[] = [];
  notifLoading  = true;
  showNotifPanel = false;
  get unreadCount(): number { return this.notifications.filter(n => n.status === 'Unread').length; }

  constructor(
    private auth:   AuthService,
    private ds:     DashboardService,
    private router: Router,
    private http:   HttpClient
  ) {
    this.user = this.auth.currentUser;
  }

  ngOnInit() {
    // Load notifications for this CTM
    this.http.get<any>(`${environment.apiUrl}/notifications/my?pageSize=30`)
      .pipe(catchError(() => of({ items: [] })), takeUntil(this.destroy$))
      .subscribe(res => {
        this.notifications = res.items ?? [];
        this.notifLoading  = false;
      });

    forkJoin({
      protocols:         this.ds.count('protocols'),
      activeEnrollments: this.ds.count('enrollments', { status: 'Active' }),
      aeCount:           this.ds.count('adverse-events'),
      deviationCount:    this.ds.count('deviations'),
      recentProtocols:   this.ds.list<any>('protocols'),
      recentAEs:         this.ds.list<any>('adverse-events'),
      recentDeviations:  this.ds.list<any>('deviations'),
    }).pipe(takeUntil(this.destroy$)).subscribe(d => {
      this.protocols         = d.protocols;
      this.activeEnrollments = d.activeEnrollments;
      this.aeCount           = d.aeCount;
      this.deviationCount    = d.deviationCount;
      this.recentProtocols   = d.recentProtocols;
      this.recentAEs         = d.recentAEs;
      this.recentDeviations  = d.recentDeviations;
      this.loading           = false;
    });
  }

  get firstName() { return this.user?.name?.split(' ')[0] ?? this.user?.name; }

  manageProtocols()     { this.router.navigate(['/dashboard/protocols']); }
  manageSites()         { this.router.navigate(['/dashboard/sites']); }
  manageAssignments()   { this.router.navigate(['/dashboard/assignments']); }
  manageAdverseEvents() { this.router.navigate(['/dashboard/adverse-events']); }
  manageDeviations()    { this.router.navigate(['/dashboard/deviations']); }
  manageReports()       { this.router.navigate(['/dashboard/reports']); }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      Active: 'badge-green', Completed: 'badge-blue',
      Paused: 'badge-amber', Draft: 'badge-slate', Terminated: 'badge-red'
    };
    return m[s] ?? 'badge-slate';
  }

  /** Returns a CSS width string for the protocol progress bar based on status. */
  protocolBarWidth(status: string): string {
    const m: Record<string, string> = {
      Active: '75%', Completed: '100%',
      Paused: '50%', Draft: '20%', Terminated: '30%'
    };
    return m[status] ?? '40%';
  }

  severityClass(s: string): string {
    if (s === 'Critical' || s === 'Severe') return 'badge-red';
    if (s === 'Moderate') return 'badge-amber';
    if (s === 'Mild') return 'badge-green';
    return 'badge-slate';
  }

  aeStatusClass(s: string): string {
    if (s === 'Open') return 'badge-red';
    if (s === 'Under Review') return 'badge-amber';
    if (s === 'Resolved') return 'badge-green';
    return 'badge-slate';
  }

  devStatusClass(s: string): string {
    if (s === 'Open') return 'badge-red';
    if (s === 'Under Review') return 'badge-amber';
    if (s === 'Closed' || s === 'Resolved') return 'badge-green';
    return 'badge-slate';
  }

  markAsRead(n: any): void {
    if (n.status === 'Read') return;
    this.http.post(`${environment.apiUrl}/notifications/${n.notificationID}/read`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => { n.status = 'Read'; } });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
