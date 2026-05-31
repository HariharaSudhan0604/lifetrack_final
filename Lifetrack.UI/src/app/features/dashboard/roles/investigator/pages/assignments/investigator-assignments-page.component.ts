import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { AuthService } from '../../../../../../core/services/auth.service';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { environment } from '../../../../../../../environments/environment';

@Component({
  selector: 'app-investigator-assignments-page',
  standalone: false,
  templateUrl: './investigator-assignments-page.component.html',
  styleUrls: ['./investigator-assignments-page.component.css']
})
export class InvestigatorAssignmentsPageComponent implements OnInit {

  // ── Lookup maps ────────────────────────────────────────────────────────────
  protocolMap: Record<number, string> = {};
  siteMap: Record<number, string>     = {};
  lookupsReady = false;

  // ── List state ─────────────────────────────────────────────────────────────
  assignmentList: any[] = [];
  listLoading    = false;
  listTotalCount = 0;
  searchTerm     = '';
  filterStatus   = '';

  readonly statuses = ['Pending', 'Active', 'Suspended', 'Completed'];

  private uid: number | null = null;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private nav: NavigationService
  ) {}

  ngOnInit() {
    this.uid = this.auth.currentUser?.userID ?? null;

    forkJoin({
      protocols: this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=500`)
        .pipe(catchError(() => of({ items: [] }))),
      sites:     this.http.get<any>(`${environment.apiUrl}/sites?pageSize=500`)
        .pipe(catchError(() => of({ items: [] })))
    }).subscribe(({ protocols, sites }) => {
      const pm: Record<number, string> = {};
      (protocols.items ?? []).forEach((p: any) => pm[p.protocolID] = p.title);
      this.protocolMap = pm;

      const sm: Record<number, string> = {};
      (sites.items ?? []).forEach((s: any) => sm[s.siteID] = s.name);
      this.siteMap = sm;

      this.lookupsReady = true;
      this.loadAssignments();
    });
  }

  goBack() { this.nav.back('/dashboard/investigator'); }

  onSearch(value: string) { this.searchTerm = value; }

  onStatusChange(value: string) { this.filterStatus = value; this.loadAssignments(); }

  onFilterChange() { this.loadAssignments(); }

  clearFilters() {
    this.searchTerm  = '';
    this.filterStatus = '';
    this.loadAssignments();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterStatus);
  }

  // client-side search across protocol name, site name
  get filteredList(): any[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.assignmentList;
    return this.assignmentList.filter(a =>
      this.protocolName(a.protocolID).toLowerCase().includes(term) ||
      this.siteName(a.siteID).toLowerCase().includes(term)
    );
  }

  // ── List ───────────────────────────────────────────────────────────────────
  loadAssignments() {
    if (!this.uid) return;
    this.listLoading = true;

    const qs = new URLSearchParams({ investigatorId: String(this.uid), pageSize: '200' });
    if (this.filterStatus) qs.set('status', this.filterStatus);

    this.http.get<any>(`${environment.apiUrl}/site-protocols?${qs}`)
      .pipe(catchError(() => of({ items: [], totalCount: 0 })))
      .subscribe(r => {
        this.assignmentList = r.items ?? [];
        this.listTotalCount = r.totalCount ?? 0;
        this.listLoading    = false;
      });
  }

  protocolName(id: number) { return this.protocolMap[id] ?? `Protocol #${id}`; }
  siteName(id: number)     { return this.siteMap[id]     ?? `Site #${id}`; }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      Active: 'badge-green', Pending: 'badge-amber',
      Suspended: 'badge-red', Completed: 'badge-blue'
    };
    return m[s] ?? 'badge-slate';
  }
}
