import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Subject } from 'rxjs';
import { catchError, of, takeUntil } from 'rxjs';
import { AuthService } from '../../../../../core/services/auth.service';
import { NavigationService } from '../../../../../core/services/navigation.service';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-patient-enrollments-page',
  standalone: false,
  templateUrl: './patient-enrollments-page.component.html',
  styleUrls: ['./patient-enrollments-page.component.css']
})
export class PatientEnrollmentsPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading         = true;
  enrollments:    any[] = [];
  protocolMap:    Record<number, string> = {};
  siteMap:        Record<number, string> = {};
  siteProtocolMap: Record<number, any>  = {};
  investigatorMap: Record<number, any>  = {};

  searchTerm   = '';
  filterStatus = '';
  readonly statuses = ['Screened', 'Enrolled', 'Active', 'Completed', 'Withdrawn'];

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private nav: NavigationService
  ) {}

  ngOnInit(): void {
    const uid = this.auth.currentUser?.userID;
    this.http.get<any>(`${environment.apiUrl}/patients?pageSize=200`)
      .pipe(catchError(() => of({ items: [] })), takeUntil(this.destroy$))
      .subscribe(res => {
        const match = (res.items ?? []).find((p: any) => p.userID === uid);
        if (!match) { this.loading = false; return; }
        this.loadData(match.patientID);
      });
  }

  private loadData(patientID: number): void {
    forkJoin({
      enrollments:   this.http.get<any>(`${environment.apiUrl}/enrollments?patientId=${patientID}&pageSize=200`)
                       .pipe(catchError(() => of({ items: [] }))),
      protocols:     this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`)
                       .pipe(catchError(() => of({ items: [] }))),
      siteProtocols: this.http.get<any>(`${environment.apiUrl}/site-protocols?pageSize=200`)
                       .pipe(catchError(() => of({ items: [] }))),
      sites:         this.http.get<any>(`${environment.apiUrl}/sites?pageSize=200`)
                       .pipe(catchError(() => of({ items: [] }))),
    }).pipe(takeUntil(this.destroy$)).subscribe(({ enrollments, protocols, siteProtocols, sites }) => {
      (protocols.items     ?? []).forEach((p: any)  => this.protocolMap[p.protocolID]              = p.title);
      (sites.items         ?? []).forEach((s: any)  => this.siteMap[s.siteID]                      = s.name);
      (siteProtocols.items ?? []).forEach((sp: any) => this.siteProtocolMap[sp.siteProtocolID]     = sp);

      this.enrollments = enrollments.items ?? [];
      this.loading     = false;

      // Fetch investigators for each unique siteProtocol
      const pairs: { spID: number; invID: number }[] = [];
      const seen = new Set<number>();
      for (const e of this.enrollments) {
        const sp    = this.siteProtocolMap[e.siteProtocolID];
        const invID = sp?.investigatorID ?? sp?.investigatorId ?? sp?.InvestigatorID;
        if (invID && !seen.has(e.siteProtocolID)) {
          seen.add(e.siteProtocolID);
          pairs.push({ spID: e.siteProtocolID, invID });
        }
      }
      if (pairs.length > 0) {
        const requests = pairs.reduce((acc, { spID, invID }) => {
          acc[spID] = this.http.get<any>(`${environment.apiUrl}/users/${invID}`)
                        .pipe(catchError(() => of(null)));
          return acc;
        }, {} as Record<number, any>);
        forkJoin(requests).pipe(takeUntil(this.destroy$))
          .subscribe(results => { this.investigatorMap = results; });
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  protocolName(spID: number): string {
    const sp = this.siteProtocolMap[spID];
    return sp ? (this.protocolMap[sp.protocolID] ?? `Protocol #${sp.protocolID}`) : `SP #${spID}`;
  }
  siteName(spID: number): string {
    const sp = this.siteProtocolMap[spID];
    return sp ? (this.siteMap[sp.siteID] ?? `Site #${sp.siteID}`) : '—';
  }
  investigatorName(spID: number): string {
    const inv = this.investigatorMap[spID];
    return inv?.name ?? inv?.Name ?? '';
  }
  investigatorEmail(spID: number): string {
    const inv = this.investigatorMap[spID];
    return inv?.email ?? inv?.Email ?? '';
  }
  investigatorPhone(spID: number): string {
    const inv = this.investigatorMap[spID];
    return inv?.phone ?? inv?.Phone ?? '';
  }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      Active: 'badge-green', Enrolled: 'badge-cyan',
      Screened: 'badge-purple', Completed: 'badge-blue', Withdrawn: 'badge-red'
    };
    return m[s] ?? 'badge-slate';
  }

  get filtered(): any[] {
    let list = this.enrollments;
    if (this.filterStatus) list = list.filter(e => e.status === this.filterStatus);
    const term = this.searchTerm.trim().toLowerCase();
    if (term) list = list.filter(e =>
      this.protocolName(e.siteProtocolID).toLowerCase().includes(term) ||
      this.siteName(e.siteProtocolID).toLowerCase().includes(term)
    );
    return list;
  }

  goBack(): void { this.nav.back('/dashboard/patient'); }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
