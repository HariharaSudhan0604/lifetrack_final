import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';

@Component({
  selector: 'app-admin-reports-page',
  standalone: false,
  templateUrl: './admin-reports-page.component.html',
  styleUrls: ['./admin-reports-page.component.css']
})
export class AdminReportsPageComponent implements OnInit {
  reports: any[] = [];
  loading = false;
  errorMsg = '';
  successMsg = '';

  selectedScope = 'All';
  scopeFilters = ['All', 'Global', 'Protocol', 'Site'];

  showCreateModal = false;
  createForm!: FormGroup;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private router: Router,
    private nav: NavigationService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadReports();
  }

  buildForm(): void {
    this.createForm = this.fb.group({
      scope: ['', Validators.required],
      enrollmentRate: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      dropoutRate: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      aeCount: ['', [Validators.required, Validators.min(0)]],
      generatedDate: ['', Validators.required]
    });
  }

  get f() {
    return this.createForm.controls;
  }

  loadReports(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/kpi-reports?pageSize=200`)
      .pipe(catchError(() => of({ data: [] })))
      .subscribe({
        next: (res) => {
          this.reports = res?.items ?? [];
          this.loading = false;
        },
        error: () => {
          this.errorMsg = 'Failed to load reports.';
          this.loading = false;
        }
      });
  }

  get filteredReports(): any[] {
    if (this.selectedScope === 'All') return this.reports;
    return this.reports.filter(r => {
      const scope: string = r.scope ?? '';
      if (this.selectedScope === 'Global') return scope === 'Global';
      if (this.selectedScope === 'Protocol') return scope.startsWith('Protocol');
      if (this.selectedScope === 'Site') return scope.startsWith('Site');
      return true;
    });
  }

  setScope(scope: string): void {
    this.selectedScope = scope;
  }

  openCreateModal(): void {
    this.createForm.reset();
    this.successMsg = '';
    this.errorMsg = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.value;
    const payload = {
      scope: v.scope,
      enrollmentRate: +v.enrollmentRate,
      dropoutRate: +v.dropoutRate,
      aeCount: +v.aeCount,
      generatedDate: v.generatedDate
    };
    this.http.post(`${environment.apiUrl}/kpi-reports`, payload).subscribe({
      next: (report: any) => {
        this.reports.unshift(report);
        this.successMsg = 'Report generated successfully.';
        this.showCreateModal = false;
      },
      error: () => {
        this.errorMsg = 'Failed to generate report.';
      }
    });
  }

  scopeBadgeClass(scope: string): string {
    if (!scope) return 'badge-slate';
    if (scope === 'Global') return 'badge-purple';
    if (scope.startsWith('Protocol')) return 'badge-blue';
    if (scope.startsWith('Site')) return 'badge-green';
    return 'badge-slate';
  }

  get avgEnrollmentRate(): number {
    if (!this.filteredReports.length) return 0;
    return this.filteredReports.reduce((s, r) => s + (+r.enrollmentRate), 0) / this.filteredReports.length;
  }

  get avgDropoutRate(): number {
    if (!this.filteredReports.length) return 0;
    return this.filteredReports.reduce((s, r) => s + (+r.dropoutRate), 0) / this.filteredReports.length;
  }

  get totalAEs(): number {
    return this.filteredReports.reduce((s, r) => s + (+r.aeCount), 0);
  }

  cap(val: number, max = 100): number {
    return Math.min(val, max);
  }

  goBack(): void {
    this.nav.back('/dashboard/admin');
  }
}
