import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../../../environments/environment';
import { AuthService } from '../../../../../../core/services/auth.service';
import { NavigationService } from '../../../../../../core/services/navigation.service';

@Component({
  selector: 'app-investigator-deviations-page',
  standalone: false,
  templateUrl: './investigator-deviations-page.component.html',
  styleUrls: ['./investigator-deviations-page.component.css']
})
export class InvestigatorDeviationsPageComponent implements OnInit {
  loading = true;
  submitting = false;
  error = '';
  success = '';
  showModal = false;

  siteProtocols: any[] = [];
  protocols: any[] = [];
  sites: any[] = [];
  deviations: any[] = [];

  filteredDeviations: any[] = [];
  siteProtocolIDs: Set<number> = new Set();

  protocolMap: Record<number, string> = {};
  siteMap: Record<number, string> = {};
  siteProtocolMap: Record<number, any> = {};

  form = {
    siteProtocolID: '',
    description: '',
    severity: '',
    status: 'Open'
  };

  formErrors: Record<string, string> = {};
  editFormErrors: Record<string, string> = {};

  // ── Edit ───────────────────────────────────────────────────────────────────
  showEditModal  = false;
  editingDev: any = null;
  editSubmitting = false;
  editError      = '';
  editSuccess    = '';
  editForm = { description: '', severity: '', status: '' };
  editSeverities = ['Minor', 'Moderate', 'Major', 'Critical'];
  editStatuses   = ['Open', 'Under Review', 'Resolved'];

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private nav: NavigationService
  ) {}

  ngOnInit(): void {
    const uid = this.authService.currentUser?.userID;
    this.loadData(uid);
  }

  loadData(uid: number | undefined): void {
    forkJoin({
      siteProtocols: this.http.get<any>(`${environment.apiUrl}/site-protocols?investigatorId=${uid}&pageSize=50`).pipe(catchError(() => of({ items: [] }))),
      protocols: this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`).pipe(catchError(() => of({ items: [] }))),
      sites: this.http.get<any>(`${environment.apiUrl}/sites?pageSize=200`).pipe(catchError(() => of({ items: [] }))),
      deviations: this.http.get<any>(`${environment.apiUrl}/deviations?pageSize=200`).pipe(catchError(() => of({ items: [] })))
    }).subscribe({
      next: (results) => {
        this.siteProtocols = results.siteProtocols.items || [];
        this.protocols = results.protocols.items || [];
        this.sites = results.sites.items || [];
        this.deviations = results.deviations.items || [];

        this.buildMaps();
        this.filterData();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  buildMaps(): void {
    this.protocols.forEach(p => {
      this.protocolMap[+p.protocolID] = p.title;
    });
    this.sites.forEach(s => {
      this.siteMap[+s.siteID] = s.name || s.siteName;
    });
    this.siteProtocols.forEach(sp => {
      this.siteProtocolMap[+sp.siteProtocolID] = sp;
      this.siteProtocolIDs.add(+sp.siteProtocolID);
    });
  }

  filterData(): void {
    this.filteredDeviations = this.deviations.filter(d => this.siteProtocolIDs.has(+d.siteProtocolID));
  }

  spLabel(sp: any): string {
    const protocol = this.protocolMap[+sp.protocolID] || `Protocol #${sp.protocolID}`;
    const site     = this.siteMap[+sp.siteID]         || `Site #${sp.siteID}`;
    return `${protocol} @ ${site}`;
  }

  openModal(): void {
    this.form = { siteProtocolID: '', description: '', severity: '', status: 'Open' };
    this.error = '';
    this.success = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.error = '';
    this.success = '';
  }

  validateForm(): boolean {
    this.formErrors = {};
    if (!this.form.siteProtocolID) this.formErrors['siteProtocolID'] = 'Site protocol is required.';
    if (!this.form.severity)       this.formErrors['severity']       = 'Severity is required.';
    if (!this.form.status)         this.formErrors['status']         = 'Status is required.';
    if (!this.form.description || !this.form.description.trim()) {
      this.formErrors['description'] = 'Description is required.';
    } else if (this.form.description.trim().length < 10) {
      this.formErrors['description'] = 'Description must be at least 10 characters.';
    } else if (this.form.description.trim().length > 1000) {
      this.formErrors['description'] = 'Description cannot exceed 1000 characters.';
    }
    return Object.keys(this.formErrors).length === 0;
  }

  submitDeviation(): void {
    if (!this.validateForm()) {
      this.error = 'Please fix the errors below.';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    const payload = {
      siteProtocolID: this.form.siteProtocolID,
      description: this.form.description,
      severity: this.form.severity,
      status: this.form.status
    };

    this.http.post<any>(`${environment.apiUrl}/deviations`, payload).subscribe({
      next: (created) => {
        this.deviations.push(created);
        this.filteredDeviations = this.deviations.filter(d => this.siteProtocolIDs.has(d.siteProtocolID));
        this.success = 'Deviation reported successfully.';
        this.submitting = false;
        setTimeout(() => this.closeModal(), 1500);
      },
      error: () => {
        this.error = 'Failed to submit deviation. Please try again.';
        this.submitting = false;
      }
    });
  }

  severityClass(s: string): string {
    if (s === 'Critical' || s === 'Major') return 'badge-red';
    if (s === 'Moderate') return 'badge-amber';
    if (s === 'Minor') return 'badge-green';
    return 'badge-default';
  }

  statusClass(s: string): string {
    if (s === 'Open') return 'badge-red';
    if (s === 'Under Review') return 'badge-amber';
    if (s === 'Resolved') return 'badge-green';
    return 'badge-default';
  }

  openEditModal(dev: any): void {
    this.editingDev = dev;
    this.editForm = {
      description: dev.description ?? '',
      severity:    dev.severity    ?? '',
      status:      dev.status      ?? 'Open'
    };
    this.editError   = '';
    this.editSuccess = '';
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingDev = null;
  }

  validateEditForm(): boolean {
    this.editFormErrors = {};
    if (!this.editForm.severity) this.editFormErrors['severity'] = 'Severity is required.';
    if (!this.editForm.status)   this.editFormErrors['status']   = 'Status is required.';
    if (!this.editForm.description || !this.editForm.description.trim()) {
      this.editFormErrors['description'] = 'Description is required.';
    } else if (this.editForm.description.trim().length < 10) {
      this.editFormErrors['description'] = 'Description must be at least 10 characters.';
    } else if (this.editForm.description.trim().length > 1000) {
      this.editFormErrors['description'] = 'Description cannot exceed 1000 characters.';
    }
    return Object.keys(this.editFormErrors).length === 0;
  }

  submitEdit(): void {
    if (!this.validateEditForm()) {
      this.editError = 'Please fix the errors below.';
      return;
    }
    this.editSubmitting = true;
    this.editError = '';

    const payload = {
      siteProtocolID: this.editingDev.siteProtocolID,
      description:    this.editForm.description,
      severity:       this.editForm.severity,
      status:         this.editForm.status
    };

    this.http.put<any>(`${environment.apiUrl}/deviations/${this.editingDev.deviationID}`, payload).subscribe({
      next: () => {
        Object.assign(this.editingDev, payload);
        this.editSuccess    = 'Deviation updated successfully.';
        this.editSubmitting = false;
        setTimeout(() => this.closeEditModal(), 1200);
      },
      error: () => {
        this.editError      = 'Failed to update deviation. Please try again.';
        this.editSubmitting = false;
      }
    });
  }

  protocolName(dev: any): string {
    const sp = this.siteProtocolMap[+dev.siteProtocolID];
    return sp ? (this.protocolMap[+sp.protocolID] ?? `Protocol #${sp.protocolID}`) : `SP #${dev.siteProtocolID}`;
  }

  siteName(dev: any): string {
    const sp = this.siteProtocolMap[+dev.siteProtocolID];
    return sp ? (this.siteMap[+sp.siteID] ?? `Site #${sp.siteID}`) : '—';
  }

  goBack(): void {
    this.nav.back('/dashboard/investigator');
  }
}
