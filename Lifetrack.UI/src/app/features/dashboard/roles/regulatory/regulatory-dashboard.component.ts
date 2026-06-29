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
  selector: 'app-regulatory-dashboard',
  standalone: false,
  templateUrl: './regulatory-dashboard.component.html',
  styleUrls: ['./regulatory-dashboard.component.css']
})
export class RegulatoryDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  user: UserInfo | null;

  today = new Date();

  totalDocs = 0; approvedDocs = 0; pendingDocs = 0;
  openDeviations = 0;
  severeAEs = 0;
  kpiReportsToReview = 0;
  escalatedAEs = 0;
  escalatedDeviations = 0;

  /** Count of deviation IDs the CTM explicitly escalated (read from localStorage). */
  escalatedDevCount = 0;

  // ── Notifications ──────────────────────────────────────────────────────────
  notifications:   any[] = [];
  notifLoading   = true;
  showNotifPanel = false;
  notifPage      = 1;
  readonly notifPageSize = 5;

  get unreadCount(): number { return this.notifications.filter(n => n.status === 'Unread').length; }
  get notifTotalPages(): number { return Math.max(1, Math.ceil(this.notifications.length / this.notifPageSize)); }
  get pagedNotifications(): any[] {
    const start = (this.notifPage - 1) * this.notifPageSize;
    return this.notifications.slice(start, start + this.notifPageSize);
  }

  get escalatedCount(): number { return this.escalatedAEs + this.escalatedDeviations; }
  recentDocs: any[] = [];
  recentDeviations: any[] = [];
  loading = true;

  // ── Lookup maps for deviation context ────────────────────────────────
  protocolMap:     Record<number, string> = {};
  siteMap:         Record<number, string> = {};
  siteProtocolMap: Record<number, any>    = {};

  /** Percentage of approved documents out of total. */
  get complianceScore(): number {
    if (!this.totalDocs) return 0;
    return Math.round((this.approvedDocs / this.totalDocs) * 100);
  }

  /** Dynamic CSS class for the compliance score value. */
  get complianceClass(): string {
    if (!this.totalDocs)              return 'kpi-muted';
    if (this.complianceScore >= 90)   return 'kpi-good';
    if (this.complianceScore >= 70)   return 'kpi-warn';
    return 'kpi-danger';
  }

  /** Dynamic sub-note for the compliance score card. */
  get complianceNote(): string {
    if (!this.totalDocs)              return 'No documents yet';
    if (this.complianceScore >= 90)   return 'Above threshold';
    if (this.complianceScore >= 70)   return 'Needs attention';
    return 'Below threshold';
  }

  /** Open deviations = Reported/UnderReview — includes legacy "Open"/"Under Review" DB values. */
  get openDeviationsList(): any[] {
    return this.recentDeviations.filter((d: any) =>
      d.status === 'Reported'    || d.status === 'Open' ||
      d.status === 'UnderReview' || d.status === 'Under Review'
    );
  }

  /** Count of documents not yet approved (for the "Documents to approve" panel). */
  get pendingReviewDocs(): number {
    return this.pendingDocs;
  }

  constructor(
    private auth:   AuthService,
    private ds:     DashboardService,
    private router: Router,
    private http:   HttpClient
  ) {
    this.user = this.auth.currentUser;
  }

  ngOnInit() {
    // Read escalated deviation IDs that CTM explicitly flagged
    try {
      const stored = JSON.parse(localStorage.getItem('escalated_dev_ids') || '[]');
      this.escalatedDevCount = Array.isArray(stored) ? stored.length : 0;
    } catch { this.escalatedDevCount = 0; }

    // Load notifications for this regulatory officer
    this.http.get<any>(`${environment.apiUrl}/notifications/my?pageSize=30`)
      .pipe(catchError(() => of({ items: [] })), takeUntil(this.destroy$))
      .subscribe(res => {
        this.notifications = res.items ?? [];
        this.notifLoading  = false;
      });

    forkJoin({
      // KPI Reports pending review (Draft = not yet reviewed)
      kpiDraft:         this.ds.count('kpi-reports', { status: 'Draft' }),
      // Documents
      totalDocs:        this.ds.count('documents'),
      approvedDocs:     this.ds.count('documents', { status: 'Approved' }),
      pendingDocs:      this.ds.count('documents', { status: 'Draft' }),
      // Deviations — count open statuses (current + legacy values) separately then sum
      reportedDevs:     this.ds.count('deviations', { status: 'Reported' }),
      openDevs:         this.ds.count('deviations', { status: 'Open' }),           // legacy
      underReviewDevs:  this.ds.count('deviations', { status: 'UnderReview' }),
      legacyReviewDevs: this.ds.count('deviations', { status: 'Under Review' }),   // legacy
      // AEs — count all high-severity tiers + escalated (UnderReview)
      severeAEs:        this.ds.count('adverse-events', { severity: 'Severe' }),
      lifeThreatAEs:    this.ds.count('adverse-events', { severity: 'LifeThreatening' }),
      fatalAEs:         this.ds.count('adverse-events', { severity: 'Fatal' }),
      escalatedAEs:     this.ds.count('adverse-events', { status: 'UnderReview' }),
      escalatedDevs:    this.ds.count('deviations',     { status: 'UnderReview' }),
      // Lists for panels
      recentDocs:       this.ds.list<any>('documents',      { pageSize: '10' }),
      recentDeviations: this.ds.list<any>('deviations',     { pageSize: '100' }),
      protocols:        this.ds.list<any>('protocols',       { pageSize: '200' }),
      siteProtocols:    this.ds.list<any>('site-protocols',  { pageSize: '200' }),
      sites:            this.ds.list<any>('sites',           { pageSize: '200' }),
    }).pipe(takeUntil(this.destroy$)).subscribe(d => {
      this.kpiReportsToReview = d.kpiDraft;
      this.totalDocs          = d.totalDocs;
      this.approvedDocs     = d.approvedDocs;
      this.pendingDocs      = d.pendingDocs;
      this.openDeviations   = d.reportedDevs + d.openDevs + d.underReviewDevs + d.legacyReviewDevs;
      this.severeAEs          = d.severeAEs + d.lifeThreatAEs + d.fatalAEs;
      this.escalatedAEs       = d.escalatedAEs;
      this.escalatedDeviations = d.escalatedDevs;
      this.recentDocs       = d.recentDocs;
      this.recentDeviations = d.recentDeviations;

      // Build lookup maps
      d.protocols.forEach((p: any)      => this.protocolMap[p.protocolID]          = p.title);
      d.sites.forEach((s: any)          => this.siteMap[s.siteID]                  = s.name);
      d.siteProtocols.forEach((sp: any) => this.siteProtocolMap[sp.siteProtocolID] = sp);

      this.loading = false;
    });
  }

  // ── Deviation lookup helpers ──────────────────────────────────────────
  devProtocolName(siteProtocolID: number): string {
    const sp = this.siteProtocolMap[siteProtocolID];
    if (!sp) return `Protocol #${siteProtocolID}`;
    return this.protocolMap[sp.protocolID] ?? `Protocol #${sp.protocolID}`;
  }

  devSiteName(siteProtocolID: number): string {
    const sp = this.siteProtocolMap[siteProtocolID];
    if (!sp) return '—';
    return this.siteMap[sp.siteID] ?? `Site #${sp.siteID}`;
  }

  get firstName() { return this.user?.name?.split(' ')[0] ?? this.user?.name; }

  viewDocuments()    { this.router.navigate(['/dashboard/documents']); }
  viewDeviations()   { this.router.navigate(['/dashboard/deviations']); }
  viewAdverseEvents(){ this.router.navigate(['/dashboard/adverse-events']); }
  viewAnalytics()    { this.router.navigate(['/dashboard/reports']); }
  viewKpiReports()   { this.router.navigate(['/dashboard/reports'], { queryParams: { section: 'reports' } }); }
  viewAuditLogs()    { this.router.navigate(['/dashboard/audit-logs']); }

  markAsRead(n: any): void {
    if (n.status === 'Read') return;
    this.http.post(`${environment.apiUrl}/notifications/${n.notificationID}/read`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => { n.status = 'Read'; } });
  }

  navigateToNotifications(): void { this.router.navigate(['/dashboard/notifications']); }

  deleteNotification(n: any): void {
    this.http.delete(`${environment.apiUrl}/notifications/${n.notificationID}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => {
        this.notifications = this.notifications.filter((x: any) => x.notificationID !== n.notificationID);
      }});
  }

  docStatusClass(s: string): string {
    const m: Record<string, string> = {
      Approved: 'badge-green', 'Under Review': 'badge-amber',
      Pending: 'badge-amber', Draft: 'badge-slate', Rejected: 'badge-red'
    };
    return m[s] ?? 'badge-slate';
  }

  devSeverityClass(s: string): string {
    const m: Record<string, string> = {
      Critical: 'badge-red', Major: 'badge-red',
      Moderate: 'badge-amber', Minor: 'badge-green'
    };
    return m[s] ?? 'badge-slate';
  }

  devStatusClass(s: string): string {
    // Handles both current API values and legacy values stored in older records
    if (s === 'Reported'    || s === 'Open')         return 'badge-red';
    if (s === 'UnderReview' || s === 'Under Review') return 'badge-amber';
    if (s === 'Resolved')                             return 'badge-green';
    if (s === 'Closed')                               return 'badge-slate';
    return 'badge-slate';
  }

  /** Human-readable label — normalises both current and legacy status values. */
  devStatusLabel(s: string): string {
    const labels: Record<string, string> = {
      Reported: 'Reported', Open: 'Reported',
      UnderReview: 'Under Review', 'Under Review': 'Under Review',
      Resolved: 'Resolved', Closed: 'Closed'
    };
    return labels[s] ?? s;
  }

  /** Human-readable label for document status keys. */
  docStatusLabel(s: string): string {
    return s === 'UnderReview' ? 'Under Review' : s;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

