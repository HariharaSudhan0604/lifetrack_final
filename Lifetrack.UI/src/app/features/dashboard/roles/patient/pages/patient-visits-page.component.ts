import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Subject } from 'rxjs';
import { catchError, of, takeUntil } from 'rxjs';
import { AuthService } from '../../../../../core/services/auth.service';
import { NavigationService } from '../../../../../core/services/navigation.service';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-patient-visits-page',
  standalone: false,
  templateUrl: './patient-visits-page.component.html',
  styleUrls: ['./patient-visits-page.component.css']
})
export class PatientVisitsPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading         = true;
  visits:         any[] = [];
  enrollments:    any[] = [];
  protocolMap:    Record<number, string> = {};
  siteMap:        Record<number, string> = {};
  siteProtocolMap: Record<number, any>  = {};
  investigatorMap: Record<number, any>  = {};

  searchTerm   = '';
  filterStatus = '';
  readonly statuses = ['Scheduled', 'Completed', 'Missed', 'Cancelled'];

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
      allVisits:     this.http.get<any>(`${environment.apiUrl}/visits?pageSize=500`)
                       .pipe(catchError(() => of({ items: [] }))),
      protocols:     this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`)
                       .pipe(catchError(() => of({ items: [] }))),
      siteProtocols: this.http.get<any>(`${environment.apiUrl}/site-protocols?pageSize=200`)
                       .pipe(catchError(() => of({ items: [] }))),
      sites:         this.http.get<any>(`${environment.apiUrl}/sites?pageSize=200`)
                       .pipe(catchError(() => of({ items: [] }))),
    }).pipe(takeUntil(this.destroy$)).subscribe(({ enrollments, allVisits, protocols, siteProtocols, sites }) => {
      (protocols.items     ?? []).forEach((p: any)  => this.protocolMap[p.protocolID]          = p.title);
      (sites.items         ?? []).forEach((s: any)  => this.siteMap[s.siteID]                  = s.name);
      (siteProtocols.items ?? []).forEach((sp: any) => this.siteProtocolMap[sp.siteProtocolID] = sp);

      this.enrollments = enrollments.items ?? [];
      const myIDs      = new Set<number>(this.enrollments.map((e: any) => e.enrollmentID));

      this.visits = (allVisits.items ?? [])
        .filter((v: any) => myIDs.has(v.enrollmentID))
        .sort((a: any, b: any) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime());

      this.loading = false;

      // Fetch investigators
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
  enrollmentForVisit(v: any): any {
    return this.enrollments.find((e: any) => e.enrollmentID === v.enrollmentID);
  }
  protocolName(v: any): string {
    const e  = this.enrollmentForVisit(v);
    if (!e) return '—';
    const sp = this.siteProtocolMap[e.siteProtocolID];
    return sp ? (this.protocolMap[sp.protocolID] ?? `Protocol #${sp.protocolID}`) : '—';
  }
  siteName(v: any): string {
    const e  = this.enrollmentForVisit(v);
    if (!e) return '—';
    const sp = this.siteProtocolMap[e.siteProtocolID];
    return sp ? (this.siteMap[sp.siteID] ?? `Site #${sp.siteID}`) : '—';
  }
  investigatorName(v: any): string {
    const e = this.enrollmentForVisit(v);
    if (!e) return '';
    const inv = this.investigatorMap[e.siteProtocolID];
    return inv?.name ?? inv?.Name ?? '';
  }
  investigatorPhone(v: any): string {
    const e = this.enrollmentForVisit(v);
    if (!e) return '';
    const inv = this.investigatorMap[e.siteProtocolID];
    return inv?.phone ?? inv?.Phone ?? '';
  }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      Scheduled: 'badge-blue', Completed: 'badge-green',
      Missed: 'badge-amber',   Cancelled: 'badge-red'
    };
    return m[s] ?? 'badge-slate';
  }

  get filtered(): any[] {
    let list = this.visits;
    if (this.filterStatus) list = list.filter(v => v.status === this.filterStatus);
    const term = this.searchTerm.trim().toLowerCase();
    if (term) list = list.filter(v =>
      this.protocolName(v).toLowerCase().includes(term) ||
      this.siteName(v).toLowerCase().includes(term) ||
      (v.notes ?? '').toLowerCase().includes(term)
    );
    return list;
  }

  goBack(): void { this.nav.back('/dashboard/patient'); }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
