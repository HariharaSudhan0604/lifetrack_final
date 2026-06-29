import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Subject } from 'rxjs';
import { catchError, of, takeUntil } from 'rxjs';
import { AuthService } from '../../../../../core/services/auth.service';
import { NavigationService } from '../../../../../core/services/navigation.service';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-patient-symptoms-page',
  standalone: false,
  templateUrl: './patient-symptoms-page.component.html',
  styleUrls: ['./patient-symptoms-page.component.css']
})
export class PatientSymptomsPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading      = true;
  symptoms:    any[] = [];
  protocolMap: Record<number, string> = {};

  searchTerm      = '';
  filterSeverity  = '';
  filterStatus    = '';
  readonly severities = ['Mild', 'Moderate', 'Severe', 'Life-Threatening'];
  readonly statuses   = ['Reported', 'Under Review', 'Resolved', 'Closed'];

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
      symptoms:  this.http.get<any>(`${environment.apiUrl}/adverse-events?patientId=${patientID}&pageSize=200`)
                   .pipe(catchError(() => of({ items: [] }))),
      protocols: this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`)
                   .pipe(catchError(() => of({ items: [] }))),
    }).pipe(takeUntil(this.destroy$)).subscribe(({ symptoms, protocols }) => {
      (protocols.items ?? []).forEach((p: any) => this.protocolMap[p.protocolID] = p.title);

      this.symptoms = (symptoms.items ?? [])
        .sort((a: any, b: any) => new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime());
      this.loading  = false;
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  protocolName(ae: any): string {
    const pid = ae.protocolID ?? ae.ProtocolID;
    return pid ? (this.protocolMap[pid] ?? `Protocol #${pid}`) : '—';
  }

  severityClass(s: string): string {
    const m: Record<string, string> = {
      Mild: 'badge-amber', Moderate: 'badge-orange',
      Severe: 'badge-red', 'Life-Threatening': 'badge-dark-red'
    };
    return m[s] ?? 'badge-slate';
  }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      Reported: 'badge-amber', 'Under Review': 'badge-blue',
      Resolved: 'badge-green', Closed: 'badge-slate'
    };
    return m[s] ?? 'badge-slate';
  }

  get filtered(): any[] {
    let list = this.symptoms;
    if (this.filterSeverity) list = list.filter(a => a.severity === this.filterSeverity);
    if (this.filterStatus)   list = list.filter(a => a.status   === this.filterStatus);
    const term = this.searchTerm.trim().toLowerCase();
    if (term) list = list.filter(a =>
      (a.description ?? '').toLowerCase().includes(term) ||
      this.protocolName(a).toLowerCase().includes(term)
    );
    return list;
  }

  goBack(): void { this.nav.back('/dashboard/patient'); }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
