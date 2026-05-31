import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { AuthService } from '../../../../../../core/services/auth.service';
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
    private http:    HttpClient,
    private router:  Router,
    private nav:     NavigationService,
    private authSvc: AuthService
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
      // Server caps pageSize at 100 — fetch both pages to cover up to 200 users
      usersP1: this.http
        .get<any>(`${environment.apiUrl}/users?page=1&pageSize=100`)
        .pipe(catchError(() => of({ items: [] }))),
      usersP2: this.http
        .get<any>(`${environment.apiUrl}/users?page=2&pageSize=100`)
        .pipe(catchError(() => of({ items: [] })))
    }).subscribe({
      next: ({ governance, clinical, logins, usersP1, usersP2 }) => {

        /* Build user map from both pages */
        const allUsers = [...(usersP1?.items ?? []), ...(usersP2?.items ?? [])];
        allUsers.forEach((u: any) => {
          const id   = u.userID ?? u.UserID ?? u.id;
          const name = u.name   ?? u.Name   ?? u.email ?? 'Unknown';
          if (id != null) this.userMap[id] = name;
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

        /* Resolve any user IDs still missing from the map (individual lookups) */
        const missingIds = [
          ...new Set(
            this.entries
              .map(e => e.changedByUserID)
              .filter((id): id is number => id != null && !this.userMap[id])
          )
        ];
        if (missingIds.length > 0) {
          forkJoin(
            missingIds.map(id =>
              this.http.get<any>(`${environment.apiUrl}/users/${id}`)
                .pipe(catchError(() => of(null)))
            )
          ).subscribe(results => {
            results.forEach((u, i) => {
              if (u) {
                const name = u.name ?? u.Name ?? u.email ?? 'Unknown';
                this.userMap[missingIds[i]] = name;
              }
            });
          });
        }

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
  /** Returns today's date string in IST (UTC+5:30) for "today" comparisons. */
  private todayIST(): string {
    return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }
  private toISTDateStr(iso: string): string {
    return new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  get todayCount(): number {
    const today = this.todayIST();
    return this.entries.filter(e => this.toISTDateStr(e.changedAt) === today).length;
  }
  get todayLogins(): number {
    const today = this.todayIST();
    return this.loginLogs.filter(l =>
      this.toISTDateStr(l.actionTime) === today && l.action.toLowerCase().includes('login')
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

  goBack(): void {
    const role = this.authSvc.currentUser?.role;
    if (role === 'RegulatoryOfficer') this.nav.back('/dashboard/regulatory');
    else                              this.nav.back('/dashboard/admin');
  }
}
