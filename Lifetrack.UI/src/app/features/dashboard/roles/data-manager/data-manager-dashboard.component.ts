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
  selector: 'app-data-manager-dashboard',
  standalone: false,
  templateUrl: './data-manager-dashboard.component.html',
  styleUrls: ['./data-manager-dashboard.component.css']
})
export class DataManagerDashboardComponent implements OnInit, OnDestroy {
  user: UserInfo | null;
  private destroy$ = new Subject<void>();

  today = new Date();

  // ── Stats ─────────────────────────────────────────────────────────────────
  openAEs        = 0;
  openDeviations = 0;   // deviations with status "Open"
  deviations     = 0;   // total deviations
  draftDocs      = 0;
  protocolsCount = 0;

  // ── Data panels ───────────────────────────────────────────────────────────
  openAEList:       any[] = [];
  recentDeviations: any[] = [];
  loading = true;

  // ── Lookup maps ───────────────────────────────────────────────────────────
  protocolMap:     Record<number, string> = {};
  siteProtocolMap: Record<number, any>    = {};
  userMap:         Record<number, string> = {};

  // ── Notifications ──────────────────────────────────────────────────────────
  notifications:  any[] = [];
  notifLoading  = true;
  showNotifPanel = false;
  get unreadCount(): number { return this.notifications.filter(n => n.status === 'Unread').length; }

  // ── Query filter ─────────────────────────────────────────────────────────
  queryFilter = 'all';

  /** Live: AE counts grouped by protocol (real names from protocolMap). */
  aesByProtocol: Array<{ name: string; count: number; band: 'good' | 'warn' | 'bad' }> = [];

  /** Total open queries = open AEs + open deviations. */
  get totalOpenQueries(): number {
    return this.openAEs + this.openDeviations;
  }

  /** Aggregate data quality (proxy from open issues). */
  get dataQualityScore(): number {
    const open = this.openAEs + this.deviations;
    if (open === 0) return 100;
    const raw = 100 - Math.min(open * 0.6, 30);
    return Math.round(raw * 10) / 10;
  }

  get dataQualityClass(): string {
    if (this.dataQualityScore >= 90) return 'kpi-good';
    if (this.dataQualityScore >= 70) return 'kpi-warn';
    return 'kpi-danger';
  }

  get dataQualityNote(): string {
    if (this.dataQualityScore >= 90) return 'Above quality threshold';
    if (this.dataQualityScore >= 70) return 'Needs attention';
    return 'Below threshold — action required';
  }

  /** Count of open deviations (i.e. overdue queries). */
  get overdueQueries(): number {
    return this.openDeviations;
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
    this.http.get<any>(`${environment.apiUrl}/notifications/my?pageSize=30`)
      .pipe(catchError(() => of({ items: [] })), takeUntil(this.destroy$))
      .subscribe(res => { this.notifications = res.items ?? []; this.notifLoading = false; });

    forkJoin({
      openAEs:          this.ds.count('adverse-events'),
      deviations:       this.ds.count('deviations'),
      draftDocs:        this.ds.count('documents', { status: 'Draft' }),
      protocols:        this.ds.count('protocols'),
      openAEList:       this.ds.list<any>('adverse-events', { pageSize: '50' }),
      recentDeviations: this.ds.list<any>('deviations',     { pageSize: '200' }),
      protocolList:     this.ds.list<any>('protocols',      { pageSize: '200' }),
      siteProtocols:    this.ds.list<any>('site-protocols', { pageSize: '200' }),
      users:            this.ds.list<any>('users',          { pageSize: '100' }),
    }).pipe(takeUntil(this.destroy$)).subscribe(d => {
      this.openAEs        = d.openAEs;
      this.deviations     = d.deviations;
      this.draftDocs      = d.draftDocs;
      this.protocolsCount = d.protocols;
      this.openAEList     = d.openAEList;
      this.recentDeviations = d.recentDeviations;

      // Derive open deviation count from fetched list
      this.openDeviations = d.recentDeviations.filter((dev: any) => dev.status === 'Open').length;

      // ── Build lookup maps ──────────────────────────────────────────────
      d.protocolList.forEach((p: any) =>
        this.protocolMap[+p.protocolID] = p.title
      );
      d.siteProtocols.forEach((sp: any) =>
        this.siteProtocolMap[+sp.siteProtocolID] = sp
      );
      d.users.forEach((u: any) => {
        const id   = u.userID ?? u.UserID ?? u.id;
        const name = u.name   ?? u.Name   ?? u.email ?? 'Unknown';
        if (id != null) this.userMap[+id] = name;
      });

      // ── Build AE-by-protocol bars with real protocol names ─────────────
      const groups: Record<number, number> = {};
      d.openAEList.forEach((ae: any) => {
        const pid = +(ae.protocolID ?? 0);
        groups[pid] = (groups[pid] ?? 0) + 1;
      });
      const max = Math.max(1, ...Object.values(groups));
      this.aesByProtocol = Object.entries(groups)
        .map(([pid, count]) => ({
          name:  this.protocolMap[+pid] ?? `Protocol #${pid}`,
          count,
          band:  (count / max > 0.66 ? 'bad' : count / max > 0.33 ? 'warn' : 'good') as 'good' | 'warn' | 'bad'
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      this.loading = false;
    });
  }

  get firstName() { return this.user?.name?.split(' ')[0] ?? this.user?.name; }

  // ── Lookup helpers ─────────────────────────────────────────────────────────
  /** Resolve a siteProtocolID to a real protocol name. */
  protocolNameForSP(siteProtocolID: number): string {
    const sp = this.siteProtocolMap[+siteProtocolID];
    if (!sp) return `SP #${siteProtocolID}`;
    return this.protocolMap[+sp.protocolID] ?? `Protocol #${sp.protocolID}`;
  }

  /** Resolve a siteProtocolID to the assigned investigator's name. */
  investigatorNameForSP(siteProtocolID: number): string {
    const sp = this.siteProtocolMap[+siteProtocolID];
    if (!sp || !(sp.investigatorID ?? sp.InvestigatorID)) return 'Site investigator';
    const invId = sp.investigatorID ?? sp.InvestigatorID;
    return this.userMap[+invId] ?? 'Site investigator';
  }

  // ── Quick Actions ─────────────────────────────────────────────────────────
  viewAdverseEvents() { this.router.navigate(['/dashboard/adverse-events']); }
  viewDeviations()    { this.router.navigate(['/dashboard/deviations']); }
  viewDocuments()     { this.router.navigate(['/dashboard/documents']); }
  viewAnalytics()     { this.router.navigate(['/dashboard/reports']); }
  viewKpiReports()    { this.router.navigate(['/dashboard/reports'], { queryParams: { section: 'reports' } }); }
  viewReports()       { this.router.navigate(['/dashboard/reports']); }

  // ── Badge helpers ─────────────────────────────────────────────────────────
  aeSeverityClass(s: string): string {
    const m: Record<string, string> = {
      'Life-Threatening': 'badge-red', Severe: 'badge-red',
      Moderate: 'badge-amber', Mild: 'badge-green'
    };
    return m[s] ?? 'badge-slate';
  }

  devSeverityClass(s: string): string {
    const m: Record<string, string> = {
      Critical: 'badge-red', Major: 'badge-red',
      Moderate: 'badge-amber', Minor: 'badge-amber', Administrative: 'badge-blue'
    };
    return m[s] ?? 'badge-slate';
  }

  aeStatusClass(s: string): string {
    if (s === 'Reported' || s === 'Open') return 'badge-red';
    if (s === 'Under Review' || s === 'UnderReview') return 'badge-amber';
    if (s === 'Resolved') return 'badge-green';
    return 'badge-slate';
  }

  devStatusClass(s: string): string {
    const m: Record<string, string> = {
      Open: 'badge-red', 'Under Review': 'badge-amber', Resolved: 'badge-green'
    };
    return m[s] ?? 'badge-slate';
  }

  queryStatusClass(s: string): string {
    const m: Record<string, string> = {
      Awaiting: 'badge-amber', Overdue: 'badge-red',
      Replied: 'badge-green', Resolved: 'badge-green'
    };
    return m[s] ?? 'badge-slate';
  }

  /** Combined list of open queries — real protocol + investigator names. */
  get openQueries(): any[] {
    const aes = this.openAEList.map(ae => ({
      ref:    this.protocolMap[+ae.protocolID] ?? `Protocol #${ae.protocolID}`,
      kind:   'AE',
      query:  ae.description ?? 'Clarify adverse event',
      sentTo: 'Investigator',
      severity: ae.severity ?? '',
      status: 'Awaiting'
    }));

    const devs = this.recentDeviations.map(d => ({
      ref:      this.protocolNameForSP(+d.siteProtocolID),
      kind:     'Deviation',
      query:    d.description ?? 'Protocol deviation',
      sentTo:   this.investigatorNameForSP(+d.siteProtocolID),
      severity: d.severity ?? '',
      status:   d.status === 'Open' ? 'Overdue' : 'Awaiting'
    }));

    const all = [...aes, ...devs];
    if (this.queryFilter === 'overdue')  return all.filter(q => q.status === 'Overdue').slice(0, 8);
    if (this.queryFilter === 'awaiting') return all.filter(q => q.status === 'Awaiting').slice(0, 8);
    return all.slice(0, 8);
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
