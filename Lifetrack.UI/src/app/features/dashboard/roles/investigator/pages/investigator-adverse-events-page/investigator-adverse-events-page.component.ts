import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../../../environments/environment';
import { AuthService } from '../../../../../../core/services/auth.service';
import { NavigationService } from '../../../../../../core/services/navigation.service';

@Component({
  selector: 'app-investigator-adverse-events-page',
  standalone: false,
  templateUrl: './investigator-adverse-events-page.component.html',
  styleUrls: ['./investigator-adverse-events-page.component.css']
})
export class InvestigatorAdverseEventsPageComponent implements OnInit {
  loading = true;
  submitting = false;
  error = '';
  success = '';
  showModal = false;

  siteProtocols: any[] = [];
  enrollments: any[] = [];
  patients: any[] = [];
  protocols: any[] = [];
  adverseEvents: any[] = [];

  filteredAEs: any[] = [];
  displayedAEs: any[] = [];
  selectedStatus = '';
  scopePatientIDs: Set<string> = new Set();
  scopeProtocolIDs: Set<string> = new Set();

  patientMap: Record<string, string> = {};
  protocolMap: Record<string, string> = {};
  siteProtocolMap: Record<string, any> = {};

  enrolledPatients: any[] = [];
  scopeProtocols: any[] = [];

  today = new Date().toISOString().substring(0, 10);

  form = {
    patientID: '',
    protocolID: '',
    description: '',
    severity: '',
    reportedDate: ''
  };

  formErrors: Record<string, string> = {};
  editFormErrors: Record<string, string> = {};

  // ── Edit ───────────────────────────────────────────────────────────────────
  showEditModal = false;
  editingAE: any = null;
  editSubmitting = false;
  editError = '';
  editSuccess = '';
  editForm = { description: '', severity: '', status: '', reportedDate: '' };
  editStatuses = ['Open', 'Under Review', 'Resolved'];

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
      enrollments: this.http.get<any>(`${environment.apiUrl}/enrollments?pageSize=200`).pipe(catchError(() => of({ items: [] }))),
      patients: this.http.get<any>(`${environment.apiUrl}/patients?pageSize=200`).pipe(catchError(() => of({ items: [] }))),
      protocols: this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`).pipe(catchError(() => of({ items: [] }))),
      adverseEvents: this.http.get<any>(`${environment.apiUrl}/adverse-events?pageSize=200`).pipe(catchError(() => of({ items: [] })))
    }).subscribe({
      next: (results) => {
        this.siteProtocols = results.siteProtocols.items || [];
        this.enrollments = results.enrollments.items || [];
        this.patients = results.patients.items || [];
        this.protocols = results.protocols.items || [];
        this.adverseEvents = results.adverseEvents.items || [];

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
    this.patients.forEach(p => {
      this.patientMap[p.patientID] = p.name ?? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
    });
    this.protocols.forEach(p => {
      this.protocolMap[p.protocolID] = p.title;
    });
    this.siteProtocols.forEach(sp => {
      this.siteProtocolMap[sp.siteProtocolID] = sp;
    });
  }

  filterData(): void {
    const spIDs = new Set(this.siteProtocols.map(sp => sp.siteProtocolID));

    const scopeEnrollments = this.enrollments.filter(e => spIDs.has(e.siteProtocolID));
    scopeEnrollments.forEach(e => {
      this.scopePatientIDs.add(e.patientID);
      this.scopeProtocolIDs.add(e.protocolID || e.siteProtocolID);
    });

    // Resolve protocolIDs from siteProtocols for scope
    this.siteProtocols.forEach(sp => {
      if (sp.protocolID) this.scopeProtocolIDs.add(sp.protocolID);
    });

    this.filteredAEs = this.adverseEvents.filter(ae => this.scopePatientIDs.has(ae.patientID));
    this.applyStatusFilter();

    this.enrolledPatients = this.patients.filter(p => this.scopePatientIDs.has(p.patientID));
    this.scopeProtocols = this.protocols.filter(p => this.scopeProtocolIDs.has(p.protocolID));
  }

  applyStatusFilter(): void {
    if (!this.selectedStatus) {
      this.displayedAEs = [...this.filteredAEs];
    } else {
      this.displayedAEs = this.filteredAEs.filter(ae => ae.status === this.selectedStatus);
    }
  }

  clearFilter(): void {
    this.selectedStatus = '';
    this.applyStatusFilter();
  }

  openModal(): void {
    this.form = { patientID: '', protocolID: '', description: '', severity: '', reportedDate: '' };
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
    if (!this.form.patientID)    this.formErrors['patientID']    = 'Patient is required.';
    if (!this.form.protocolID)   this.formErrors['protocolID']   = 'Protocol is required.';
    if (!this.form.severity)     this.formErrors['severity']     = 'Severity is required.';
    if (!this.form.description || !this.form.description.trim()) {
      this.formErrors['description'] = 'Description is required.';
    } else if (this.form.description.trim().length < 10) {
      this.formErrors['description'] = 'Description must be at least 10 characters.';
    } else if (this.form.description.trim().length > 1000) {
      this.formErrors['description'] = 'Description cannot exceed 1000 characters.';
    }
    if (!this.form.reportedDate) {
      this.formErrors['reportedDate'] = 'Reported date is required.';
    } else if (this.form.reportedDate > this.today) {
      this.formErrors['reportedDate'] = 'Reported date cannot be in the future.';
    }
    return Object.keys(this.formErrors).length === 0;
  }

  submitAE(): void {
    if (!this.validateForm()) {
      this.error = 'Please fix the errors below.';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    const payload = {
      patientID: this.form.patientID,
      protocolID: this.form.protocolID,
      description: this.form.description,
      severity: this.form.severity,
      reportedDate: this.form.reportedDate,
      status: 'Open'
    };

    this.http.post<any>(`${environment.apiUrl}/adverse-events`, payload).subscribe({
      next: (created) => {
        this.adverseEvents.push(created);
        this.filteredAEs = this.adverseEvents.filter(ae => this.scopePatientIDs.has(ae.patientID));
        this.applyStatusFilter();
        this.success = 'Adverse event reported successfully.';
        this.submitting = false;
        setTimeout(() => this.closeModal(), 1500);
      },
      error: () => {
        this.error = 'Failed to submit adverse event. Please try again.';
        this.submitting = false;
      }
    });
  }

  severityClass(s: string): string {
    if (s === 'Critical' || s === 'Severe') return 'badge-red';
    if (s === 'Moderate') return 'badge-amber';
    if (s === 'Mild') return 'badge-green';
    return 'badge-default';
  }

  statusClass(s: string): string {
    if (s === 'Open') return 'badge-red';
    if (s === 'Under Review') return 'badge-amber';
    if (s === 'Resolved') return 'badge-green';
    return 'badge-default';
  }

  openEditModal(ae: any): void {
    this.editingAE = ae;
    this.editForm = {
      description:  ae.description  ?? '',
      severity:     ae.severity     ?? '',
      status:       ae.status       ?? 'Open',
      reportedDate: ae.reportedDate ? ae.reportedDate.substring(0, 10) : ''
    };
    this.editError   = '';
    this.editSuccess = '';
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingAE = null;
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
    if (this.editForm.reportedDate && this.editForm.reportedDate > this.today) {
      this.editFormErrors['reportedDate'] = 'Reported date cannot be in the future.';
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
      description:  this.editForm.description,
      severity:     this.editForm.severity,
      status:       this.editForm.status,
      reportedDate: this.editForm.reportedDate
    };

    this.http.put<any>(`${environment.apiUrl}/adverse-events/${this.editingAE.eventID}`, payload).subscribe({
      next: () => {
        Object.assign(this.editingAE, payload);
        this.editSuccess    = 'Adverse event updated successfully.';
        this.editSubmitting = false;
        setTimeout(() => this.closeEditModal(), 1200);
      },
      error: () => {
        this.editError      = 'Failed to update. Please try again.';
        this.editSubmitting = false;
      }
    });
  }

  goBack(): void {
    this.nav.back('/dashboard/investigator');
  }
}
