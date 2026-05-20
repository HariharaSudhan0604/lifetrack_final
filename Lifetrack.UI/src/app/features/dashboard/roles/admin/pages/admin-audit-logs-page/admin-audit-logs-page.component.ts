import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { environment } from '../../../../../../../environments/environment';

interface AuditEntry {
  auditEntryID:    number;
  entityName:      string;
  primaryKey:      string | null;
  action:          string;
  changedByUserID: number | null;
  changedAt:       string;
  source: 'Governance DB' | 'Clinical DB';
}

interface LoginLog {
  auditID:    number;
  userID:     number;
  userName:   string | null;
  action:     string;
  actionTime: string;
}

@Component({
  selector: 'app-admin-audit-logs-page',
  standalone: false,
  templateUrl: './admin-audit-logs-page.component.html',
  styleUrls: ['./admin-audit-logs-page.component.css']
})
export class AdminAuditLogsPageComponent implements OnInit {
  /* ── Data ─────────────────────────────────────────────────────────── */
  entries:   AuditEntry[] = [];
  loginLogs: LoginLog[]   = [];
  userMap:   Record<number, string> = {};

  /* ── State ────────────────────────────────────────────────────────── */
  loading   = false;
  errorMsg  = '';
  warnMsgs: string[] = [];

  activeTab: 'entries' | 'logins' = 'entries';

  /* ── Filters (Audit Entries tab) ──────────────────────────────────── */
  searchTerm     = '';
  selectedAction = 'All';
  readonly actionTabs = ['All', 'Insert', 'Update', 'Delete'];

  /* ── Filters (Login Activity tab) ────────────────────────────────── */
  loginSearch = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private nav: NavigationService
  ) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading  = true;
    this.errorMsg = '';
    this.warnMsgs = [];

    forkJoin({
      governance: this.http
        .get<any>(`${environment.apiUrl}/governance-audit-entries?pageSize=500`)
        .pipe(catchError((err: HttpErrorResponse) => {
          this.warnMsgs.push(
            `Governance DB audit entries unavailable (${err.status || 'network error'}) — restart Authentication.API & Gateway.`
          );
          return of({ items: [] });
        })),
      clinical: this.http
        .get<any>(`${environment.apiUrl}/clinical-audit-entries?pageSize=500`)
        .pipe(catchError((err: HttpErrorResponse) => {
          this.warnMsgs.push(
            `Clinical DB audit entries unavailable (${err.status || 'network error'}) — restart ProtocolSite.API & Gateway.`
          );
          return of({ items: [] });
        })),
      logins: this.http
        .get<any>(`${environment.apiUrl}/audit-logs?pageSize=500`)
        .pipe(catchError((err: HttpErrorResponse) => {
          this.warnMsgs.push(
            `Login activity unavailable (${err.status || 'network error'}) — restart Authentication.API.`
          );
          return of({ items: [] });
        })),
      users: this.http
        .get<any>(`${environment.apiUrl}/users?pageSize=200`)
        .pipe(catchError(() => of({ items: [] })))
    }).subscribe({
      next: ({ governance, clinical, logins, users }) => {

        /* Build user map first so loginLogs can use it */
        (users?.items ?? []).forEach((u: any) => {
          const id   = u.userID ?? u.id;
          const name = u.name ?? (`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || 'Unknown');
          this.userMap[id] = name;
        });

        /* Audit Entries — merge both DBs, sort newest-first */
        const govItems: AuditEntry[] = (governance?.items ?? []).map((e: any) => ({
          ...e, source: 'Governance DB' as const
        }));
        const clinItems: AuditEntry[] = (clinical?.items ?? []).map((e: any) => ({
          ...e, source: 'Clinical DB' as const
        }));
        this.entries = [...govItems, ...clinItems].sort(
          (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
        );

        /* Login Activity */
        this.loginLogs = (logins?.items ?? []).map((l: any) => ({
          auditID:    l.auditID,
          userID:     l.userID,
          userName:   l.userName ?? this.userMap[l.userID] ?? null,
          action:     l.action,
          actionTime: l.actionTime
        }));

        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to load audit data.';
        this.loading  = false;
      }
    });
  }

  /* ── Filtered Audit Entries ───────────────────────────────────────── */
  get filteredEntries(): AuditEntry[] {
    let list = this.entries;
    if (this.selectedAction !== 'All')
      list = list.filter(e => e.action === this.selectedAction);
    if (this.searchTerm.trim()) {
      const t = this.searchTerm.toLowerCase();
      list = list.filter(e =>
        e.entityName.toLowerCase().includes(t) ||
        (this.userMap[e.changedByUserID!] ?? '').toLowerCase().includes(t)
      );
    }
    return list;
  }

  /* ── Filtered Login Logs ──────────────────────────────────────────── */
  get filteredLoginLogs(): LoginLog[] {
    if (!this.loginSearch.trim()) return this.loginLogs;
    const t = this.loginSearch.toLowerCase();
    return this.loginLogs.filter(l =>
      (l.userName ?? '').toLowerCase().includes(t) ||
      l.action.toLowerCase().includes(t)
    );
  }

  /* ── Summary getters ──────────────────────────────────────────────── */
  get totalGovernance(): number {
    return this.entries.filter(e => e.source === 'Governance DB').length;
  }
  get totalClinical(): number {
    return this.entries.filter(e => e.source === 'Clinical DB').length;
  }
  get todayCount(): number {
    const today = new Date().toDateString();
    return this.entries.filter(e => new Date(e.changedAt).toDateString() === today).length;
  }
  get todayLogins(): number {
    const today = new Date().toDateString();
    return this.loginLogs.filter(l =>
      new Date(l.actionTime).toDateString() === today && l.action.toLowerCase().includes('login')
    ).length;
  }

  /* ── Helpers ──────────────────────────────────────────────────────── */
  userName(id: number | null): string {
    if (id == null) return '—';
    return this.userMap[id] ?? `User #${id}`;
  }
  userInitial(name: string | null): string {
    return (name ?? '?').charAt(0).toUpperCase() || '?';
  }

  actionClass(action: string): string {
    switch (action) {
      case 'Insert': return 'badge-insert';
      case 'Update': return 'badge-update';
      case 'Delete': return 'badge-delete';
      default:       return 'badge-slate';
    }
  }

  loginActionClass(action: string): string {
    const a = action.toLowerCase();
    if (a.includes('login'))  return 'badge-login';
    if (a.includes('logout')) return 'badge-logout';
    return 'badge-slate';
  }

  sourceClass(source: string): string {
    return source === 'Governance DB' ? 'source-gov' : 'source-clin';
  }

  setAction(a: string): void { this.selectedAction = a; }
  setTab(t: 'entries' | 'logins'): void { this.activeTab = t; }

  goBack(): void { this.nav.back('/dashboard/admin'); }
}
