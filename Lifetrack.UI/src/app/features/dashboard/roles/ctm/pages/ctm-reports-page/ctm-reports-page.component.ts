import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { environment } from '../../../../../../../environments/environment';

@Component({
  selector: 'app-ctm-reports-page',
  standalone: false,
  templateUrl: './ctm-reports-page.component.html',
  styleUrls: ['./ctm-reports-page.component.css']
})
export class CtmReportsPageComponent implements OnInit {
  loading = true;
  error   = '';

  // ── Raw counts ────────────────────────────────────────────────────────────
  totalProtocols   = 0;
  totalPatients    = 0;
  totalEnrollments = 0;
  totalVisits      = 0;

  // ── Status breakdowns ─────────────────────────────────────────────────────
  enrollmentByStatus: Record<string, number> = {};
  visitByStatus:      Record<string, number> = {};
  aeBySeverity:       Record<string, number> = { Mild: 0, Moderate: 0, Severe: 0, LifeThreatening: 0, Fatal: 0 };
  devByStatus:        Record<string, number> = { Reported: 0, UnderReview: 0, Resolved: 0, Closed: 0 };

  aeTotal  = 0;
  devTotal = 0;

  isRegulatoryOfficer = false;
  isDataManager       = false;
  isCTM               = false;

  // ── Generate report ───────────────────────────────────────────────────────
  reportScope     = '';
  reportStartDate = '';
  reportEndDate   = '';
  generating      = false;
  generateSuccess = '';
  generateError   = '';

  // ── Raw data snapshots for date-filtered recalculation ────────────────────
  private allEnrollments: any[] = [];
  private allVisits:      any[] = [];
  private allAes:         any[] = [];
  private allDevs:        any[] = [];

  // ── Saved reports ─────────────────────────────────────────────────────────
  savedReports:  any[] = [];
  reportsLoading = true;
  reportSearch   = '';
  currentPage    = 1;
  readonly pageSize = 5;

  get filteredReports(): any[] {
    const term = this.reportSearch.trim().toLowerCase();
    return term
      ? this.savedReports.filter(r => r.scope.toLowerCase().includes(term))
      : this.savedReports;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredReports.length / this.pageSize));
  }

  get pagedReports(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredReports.slice(start, start + this.pageSize);
  }

  constructor(
    private http:    HttpClient,
    private router:  Router,
    private route:   ActivatedRoute,
    private nav:     NavigationService,
    private authSvc: AuthService
  ) {}

  ngOnInit(): void {
    const role = this.authSvc.currentUser?.role;
    this.isRegulatoryOfficer = role === 'RegulatoryOfficer';
    this.isDataManager       = role === 'DataManager';

    // If navigated with ?section=reports, scroll to saved reports after data loads
    this.route.queryParams.subscribe(params => {
      if (params['section'] === 'reports') {
        setTimeout(() => {
          const el = document.getElementById('saved-reports');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 800); // wait for data to load
      }
    });
    this.isCTM               = role === 'ClinicalTrialManager';
    this.loadData();
    this.loadSavedReports();
  }

  loadData(): void {
    this.loading = true;
    this.error   = '';

    forkJoin({
      protocols:   this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=1`)         .pipe(catchError(() => of({ totalCount: 0, items: [] }))),
      patients:    this.http.get<any>(`${environment.apiUrl}/patients?pageSize=1`)           .pipe(catchError(() => of({ totalCount: 0, items: [] }))),
      enrollments: this.http.get<any>(`${environment.apiUrl}/enrollments?pageSize=500`)      .pipe(catchError(() => of({ items: [] }))),
      visits:      this.http.get<any>(`${environment.apiUrl}/visits?pageSize=500`)           .pipe(catchError(() => of({ items: [] }))),
      aes:         this.http.get<any>(`${environment.apiUrl}/adverse-events?pageSize=500`)   .pipe(catchError(() => of({ items: [] }))),
      deviations:  this.http.get<any>(`${environment.apiUrl}/deviations?pageSize=500`)       .pipe(catchError(() => of({ items: [] }))),
    }).subscribe({
      next: ({ protocols, patients, enrollments, visits, aes, deviations }) => {
        this.totalProtocols = protocols.totalCount ?? (protocols.items?.length ?? 0);
        this.totalPatients  = patients.totalCount  ?? (patients.items?.length  ?? 0);

        // Store raw arrays for date-filtered report generation
        this.allEnrollments = enrollments.items ?? [];
        this.allVisits      = visits.items      ?? [];
        this.allAes         = aes.items         ?? [];
        this.allDevs        = deviations.items  ?? [];

        // Enrollment breakdown
        const allEnr: any[] = this.allEnrollments;
        this.totalEnrollments   = allEnr.length;
        this.enrollmentByStatus = this.groupBy(allEnr, 'status');

        // Visit breakdown
        const allVis: any[] = this.allVisits;
        this.totalVisits   = allVis.length;
        this.visitByStatus = this.groupBy(allVis, 'status');

        // AE severity breakdown
        const allAes: any[] = this.allAes;
        this.aeTotal     = allAes.length;
        this.aeBySeverity = { Mild: 0, Moderate: 0, Severe: 0, LifeThreatening: 0, Fatal: 0 };
        allAes.forEach((ae: any) => {
          const s = ae.severity ?? '';
          if (s in this.aeBySeverity) this.aeBySeverity[s]++;
        });

        // Deviation status breakdown
        const allDevs: any[] = this.allDevs;
        this.devTotal    = allDevs.length;
        this.devByStatus = { Reported: 0, UnderReview: 0, Resolved: 0, Closed: 0 };
        allDevs.forEach((d: any) => {
          const s = d.status ?? '';
          if (s in this.devByStatus) this.devByStatus[s]++;
        });

        this.loading = false;
      },
      error: () => {
        this.error   = 'Failed to load analytics data.';
        this.loading = false;
      }
    });
  }

  private groupBy(arr: any[], key: string): Record<string, number> {
    const m: Record<string, number> = {};
    arr.forEach(item => { const v = item[key] ?? 'Unknown'; m[v] = (m[v] ?? 0) + 1; });
    return m;
  }

  // ── KPI helpers ───────────────────────────────────────────────────────────
  get activeEnrollments(): number { return this.enrollmentByStatus['Active'] ?? 0; }
  get upcomingVisits():    number { return this.visitByStatus['Scheduled'] ?? 0; }

  get visitComplianceRate(): number {
    if (!this.totalVisits) return 0;
    return Math.round(((this.visitByStatus['Completed'] ?? 0) / this.totalVisits) * 100);
  }

  get patientRetentionRate(): number {
    if (!this.totalPatients) return 0;
    return Math.round((this.activeEnrollments / this.totalPatients) * 100);
  }

  // ── Donut chart helpers ───────────────────────────────────────────────────
  readonly enrollmentColors: Record<string, string> = {
    Screened: '#64748b', Enrolled: '#3b82f6', Active: '#22c55e',
    Withdrawn: '#ef4444', Completed: '#8b5cf6'
  };

  readonly visitColors: Record<string, string> = {
    Scheduled: '#3b82f6', Completed: '#22c55e',
    Missed: '#ef4444', Cancelled: '#94a3b8'
  };

  get enrollmentSegments(): { label: string; color: string; count: number; pct: number }[] {
    return Object.keys(this.enrollmentColors)
      .map(label => ({
        label, color: this.enrollmentColors[label],
        count: this.enrollmentByStatus[label] ?? 0,
        pct: this.totalEnrollments
          ? Math.round(((this.enrollmentByStatus[label] ?? 0) / this.totalEnrollments) * 100)
          : 0
      }))
      .filter(s => s.count > 0);
  }

  get visitSegments(): { label: string; color: string; count: number; pct: number }[] {
    return Object.keys(this.visitColors)
      .map(label => ({
        label, color: this.visitColors[label],
        count: this.visitByStatus[label] ?? 0,
        pct: this.totalVisits
          ? Math.round(((this.visitByStatus[label] ?? 0) / this.totalVisits) * 100)
          : 0
      }))
      .filter(s => s.count > 0);
  }

  /** Build a conic-gradient string from count-based segments. */
  conicGradient(segments: { color: string; count: number }[], total: number): string {
    if (!total || segments.every(s => s.count === 0))
      return 'conic-gradient(#e2e8f0 0% 100%)';
    const parts: string[] = [];
    let cum = 0;
    segments.forEach(s => {
      const pct = (s.count / total) * 100;
      parts.push(`${s.color} ${cum}% ${cum + pct}%`);
      cum += pct;
    });
    if (cum < 100) parts.push(`#e2e8f0 ${cum}% 100%`);
    return `conic-gradient(${parts.join(', ')})`;
  }

  get enrollmentGradient(): string { return this.conicGradient(this.enrollmentSegments, this.totalEnrollments); }
  get visitGradient():      string { return this.conicGradient(this.visitSegments, this.totalVisits); }

  // ── SVG gauge helpers ─────────────────────────────────────────────────────
  /** Returns "filled empty" dash lengths for an SVG circle gauge (r=36). */
  gaugeDash(pct: number): string {
    const circ = 2 * Math.PI * 36; // ≈ 226.2
    const filled = circ * (Math.min(pct, 100) / 100);
    return `${filled} ${circ - filled}`;
  }
  /** Rotate offset so gauge starts at top: -(circ/4). */
  readonly gaugeOffset = -(2 * Math.PI * 36 / 4); // ≈ -56.5

  gaugeColor(pct: number): string {
    if (pct >= 70) return '#22c55e';
    if (pct >= 40) return '#f59e0b';
    return '#ef4444';
  }

  // ── Enrollment funnel ─────────────────────────────────────────────────────
  readonly funnelStatuses = ['Screened', 'Enrolled', 'Active', 'Withdrawn', 'Completed'];
  readonly funnelColors: Record<string, string> = {
    Screened: '#94a3b8', Enrolled: '#3b82f6', Active: '#22c55e',
    Withdrawn: '#ef4444', Completed: '#8b5cf6'
  };

  get funnelItems() {
    const counts = this.funnelStatuses.map(s => this.enrollmentByStatus[s] ?? 0);
    const max = Math.max(1, ...counts);
    return this.funnelStatuses.map((s, i) => ({
      label: s,
      count: counts[i],
      pct:   this.totalEnrollments ? Math.round((counts[i] / this.totalEnrollments) * 100) : 0,
      width: Math.round((counts[i] / max) * 100),
      color: this.funnelColors[s]
    }));
  }

  // ── Safety display labels ─────────────────────────────────────────────────
  readonly aeSeverityLabel: Record<string, string> = {
    Mild: 'Mild', Moderate: 'Moderate', Severe: 'Severe',
    LifeThreatening: 'Life-Threatening', Fatal: 'Fatal'
  };

  readonly devStatusLabel: Record<string, string> = {
    Reported: 'Reported', UnderReview: 'Under Review',
    Resolved: 'Resolved', Closed: 'Closed'
  };

  // ── Safety bar widths ─────────────────────────────────────────────────────
  safetyWidth(count: number, total: number): number {
    return total ? Math.round((count / total) * 100) : 0;
  }

  // ── KPI computed values ───────────────────────────────────────────────────
  get enrollmentRate(): number {
    if (!this.totalPatients) return 0;
    return Math.round((this.activeEnrollments / this.totalPatients) * 1000) / 10;
  }

  get dropoutRate(): number {
    if (!this.totalEnrollments) return 0;
    const withdrawn = this.enrollmentByStatus['Withdrawn'] ?? 0;
    return Math.round((withdrawn / this.totalEnrollments) * 1000) / 10;
  }

  // ── Saved reports ─────────────────────────────────────────────────────────
  loadSavedReports(): void {
    this.reportsLoading = true;
    this.http.get<any>(`${environment.apiUrl}/kpi-reports?pageSize=50`)
      .pipe(catchError(() => of({ items: [] })))
      .subscribe(res => {
        this.savedReports  = (res.items ?? []).sort((a: any, b: any) =>
          new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime());
        this.reportsLoading = false;
      });
  }

  generateReport(): void {
    if (!this.reportScope.trim()) return;
    this.generating      = true;
    this.generateSuccess = '';
    this.generateError   = '';

    // Filter raw data by selected date range
    const start = this.reportStartDate ? new Date(this.reportStartDate) : null;
    const end   = this.reportEndDate   ? new Date(this.reportEndDate)   : null;
    // Set end to end-of-day
    if (end) end.setHours(23, 59, 59, 999);

    const inRange = (dateStr: string | null | undefined): boolean => {
      if (!start && !end) return true;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (start && d < start) return false;
      if (end   && d > end)   return false;
      return true;
    };

    const filteredEnr  = this.allEnrollments.filter(e => inRange(e.enrollmentDate));
    const filteredVis  = this.allVisits.filter(v => inRange(v.visitDate ?? v.scheduledDate));
    const filteredAes  = this.allAes.filter(a => inRange(a.reportedDate));
    const filteredDevs = this.allDevs.filter(d => inRange(d.reportedDate ?? d.createdDate));

    // Recalculate KPIs from filtered data
    const totalEnr      = filteredEnr.length;
    const activeEnr     = filteredEnr.filter(e => e.status === 'Active').length;
    const withdrawnEnr  = filteredEnr.filter(e => e.status === 'Withdrawn').length;
    const totalVis      = filteredVis.length;
    const completedVis  = filteredVis.filter(v => v.status === 'Completed').length;
    const aeCount       = filteredAes.length;
    const mildAEs       = filteredAes.filter(a => a.severity === 'Mild').length;
    const moderateAEs   = filteredAes.filter(a => a.severity === 'Moderate').length;
    const severeAEs     = filteredAes.filter(a => a.severity === 'Severe' || a.severity === 'Critical').length;
    const devCount      = filteredDevs.length;
    const reportedDevs  = filteredDevs.filter(d => d.status === 'Reported' || d.status === 'Open').length;
    const resolvedDevs  = filteredDevs.filter(d => d.status === 'Resolved').length;
    const enrRate       = this.totalPatients ? Math.round((activeEnr  / this.totalPatients) * 1000) / 10 : 0;
    const dropRate      = totalEnr           ? Math.round((withdrawnEnr / totalEnr)          * 1000) / 10 : 0;
    const visitComp     = totalVis           ? Math.round((completedVis / totalVis)           * 1000) / 10 : 0;
    const retention     = this.totalPatients ? Math.round((activeEnr    / this.totalPatients) * 1000) / 10 : 0;

    const payload = {
      scope:               this.reportScope.trim(),
      enrollmentRate:      enrRate,
      dropoutRate:         dropRate,
      visitComplianceRate: visitComp,
      patientRetentionRate:retention,
      totalProtocols:      this.totalProtocols,
      totalPatients:       this.totalPatients,
      totalEnrollments:    totalEnr,
      activeEnrollments:   activeEnr,
      totalVisits:         totalVis,
      aeCount,
      mildAEs,
      moderateAEs,
      severeAEs,
      devCount,
      reportedDevs,
      resolvedDevs,
      generatedDate:       new Date().toISOString(),
      startDate:           start?.toISOString() ?? null,
      endDate:             end?.toISOString()   ?? null
    };

    this.http.post<any>(`${environment.apiUrl}/kpi-reports`, payload).subscribe({
      next: (created) => {
        this.generating      = false;
        this.generateSuccess = `Report "${created.scope}" saved successfully.`;
        this.reportScope     = '';
        this.reportStartDate = '';
        this.reportEndDate   = '';
        this.savedReports    = [created, ...this.savedReports];

        // Notify Regulatory Officers
        this.http.get<any>(`${environment.apiUrl}/users?pageSize=100`).subscribe({
          next: r => (r.items || []).filter((u: any) => u.role === 'RegulatoryOfficer').forEach((u: any) =>
            this.http.post(`${environment.apiUrl}/notifications`, {
              userID:   u.userID,
              message:  `New KPI report generated: "${created.scope}". Enrollment rate: ${this.enrollmentRate}%. AEs: ${this.aeTotal}.`,
              category: 'SystemAlert'
            }).subscribe()),
          error: () => {}
        });

        setTimeout(() => { this.generateSuccess = ''; }, 4000);
      },
      error: () => {
        this.generating    = false;
        this.generateError = 'Failed to save report. Please try again.';
      }
    });
  }

  // ── Review report (Regulatory Officer only) ───────────────────────────────
  reviewReport(report: any): void {
    this.http.patch<any>(`${environment.apiUrl}/kpi-reports/${report.reportID}/review`, {}).subscribe({
      next: (updated) => {
        report.status     = updated.status;
        report.reviewedAt = updated.reviewedAt;

        // Notify all Data Managers
        this.http.get<any>(`${environment.apiUrl}/users?pageSize=100`).subscribe({
          next: r => (r.items || []).filter((u: any) => u.role === 'DataManager').forEach((u: any) =>
            this.http.post(`${environment.apiUrl}/notifications`, {
              userID:   u.userID,
              message:  `Your KPI report "${report.scope}" has been reviewed and approved by the Regulatory Officer.`,
              category: 'SystemAlert'
            }).subscribe()),
          error: () => {}
        });
      },
      error: () => {}
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  goBack(): void {
    const role = this.authSvc.currentUser?.role;
    if (role === 'DataManager') this.nav.back('/dashboard/data-manager');
    else                        this.nav.back('/dashboard/ctm');
  }
}
