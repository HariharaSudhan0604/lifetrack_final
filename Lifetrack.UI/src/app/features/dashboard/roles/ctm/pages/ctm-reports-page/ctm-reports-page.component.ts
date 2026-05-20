import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { environment } from '../../../../../../../environments/environment';

interface KpiReport {
  reportID: number;
  scope: string;
  enrollmentRate: number;
  dropoutRate: number;
  aeCount: number;
  generatedDate: string;
}

@Component({
  selector: 'app-ctm-reports-page',
  standalone: false,
  templateUrl: './ctm-reports-page.component.html',
  styleUrls: ['./ctm-reports-page.component.css']
})
export class CtmReportsPageComponent implements OnInit {
  reports: KpiReport[] = [];
  filteredReports: KpiReport[] = [];

  loading = false;
  error = '';

  selectedScope = 'All';
  scopeCategories = ['All', 'Global', 'Protocol', 'Site'];

  constructor(
    private http: HttpClient,
    private router: Router,
    private nav: NavigationService
  ) {}

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.loading = true;
    this.error = '';

    this.http.get<any>(`${environment.apiUrl}/kpi-reports?pageSize=200`).subscribe({
      next: (res) => {
        this.reports = res.items ?? [];
        this.loading = false;
        this.applyFilter();
      },
      error: () => {
        this.error = 'Failed to load KPI reports.';
        this.loading = false;
      }
    });
  }

  selectScope(scope: string): void {
    this.selectedScope = scope;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.selectedScope === 'All') {
      this.filteredReports = [...this.reports];
    } else if (this.selectedScope === 'Global') {
      this.filteredReports = this.reports.filter(r => r.scope === 'Global');
    } else {
      this.filteredReports = this.reports.filter(r => r.scope.startsWith(this.selectedScope));
    }
  }

  scopeClass(scope: string): string {
    if (scope === 'Global') return 'badge-purple';
    if (scope.startsWith('Protocol')) return 'badge-blue';
    if (scope.startsWith('Site')) return 'badge-green';
    return 'badge-slate';
  }

  get avgEnrollmentRate(): number {
    if (!this.filteredReports.length) return 0;
    return this.filteredReports.reduce((s, r) => s + r.enrollmentRate, 0) / this.filteredReports.length;
  }

  get avgDropoutRate(): number {
    if (!this.filteredReports.length) return 0;
    return this.filteredReports.reduce((s, r) => s + r.dropoutRate, 0) / this.filteredReports.length;
  }

  get totalAEs(): number {
    return this.filteredReports.reduce((s, r) => s + r.aeCount, 0);
  }

  enrollmentClass(rate: number): string {
    if (rate >= 75) return 'rate-great';
    if (rate >= 50) return 'rate-good';
    return 'rate-poor';
  }

  dropoutClass(rate: number): string {
    if (rate <= 5)  return 'rate-great';
    if (rate <= 15) return 'rate-warn';
    return 'rate-poor';
  }

  cap(val: number, max = 100): number {
    return Math.min(val, max);
  }

  goBack(): void {
    this.nav.back('/dashboard/ctm');
  }
}
