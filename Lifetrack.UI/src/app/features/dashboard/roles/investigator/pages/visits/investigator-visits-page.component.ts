import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, catchError, of } from 'rxjs';
import { AuthService } from '../../../../../../core/services/auth.service';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { environment } from '../../../../../../../environments/environment';

@Component({
  selector: 'app-investigator-visits-page',
  standalone: false,
  templateUrl: './investigator-visits-page.component.html',
  styleUrls: ['./investigator-visits-page.component.css']
})
export class InvestigatorVisitsPageComponent implements OnInit {

  // ── Navigation view ────────────────────────────────────────────────────────
  view: 'protocols' | 'patients' | 'visits' = 'protocols';

  // ── Level 1 — Protocol assignments ────────────────────────────────────────
  myAssignments: any[]                = [];
  protocolMap: Record<number, string> = {};
  siteMap: Record<number, string>     = {};
  lookupsLoading = true;

  // ── Level 2 — Enrolled patients for selected protocol ─────────────────────
  selectedAssignment: any         = null;
  enrolledPatients: any[]         = [];
  patientMap: Record<number, any> = {};
  patientsLoading = false;

  // ── Level 3 — Visits for selected patient/enrollment ──────────────────────
  selectedEnrollment: any = null;
  visits: any[]           = [];
  visitsLoading           = false;

  // ── Add Visit modal ────────────────────────────────────────────────────────
  showAddModal  = false;
  addForm!: FormGroup;
  addSubmitting = false;
  addError      = '';
  addSuccess    = '';

  // ── Edit Visit modal ───────────────────────────────────────────────────────
  showEditModal  = false;
  editForm!: FormGroup;
  editingVisit: any = null;
  editSubmitting = false;
  editError      = '';
  editSuccess    = '';

  readonly visitStatuses = ['Scheduled', 'Completed', 'Missed', 'Cancelled'];

  private uid: number | null = null;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private fb: FormBuilder,
    private nav: NavigationService
  ) {}

  ngOnInit() {
    this.uid = this.auth.currentUser?.userID ?? null;

    this.addForm = this.fb.group({
      visitDate: ['', Validators.required],
      status:    ['Scheduled', Validators.required],
      notes:     ['', Validators.maxLength(1000)]
    });

    this.editForm = this.fb.group({
      visitDate: ['', Validators.required],
      status:    ['', Validators.required],
      notes:     ['', Validators.maxLength(1000)]
    });

    this.loadProtocols();
  }

  // ── Level 1: Load investigator's assigned protocols ────────────────────────
  loadProtocols() {
    this.lookupsLoading = true;
    forkJoin({
      assignments: this.http.get<any>(`${environment.apiUrl}/site-protocols?investigatorId=${this.uid}&pageSize=50`)
        .pipe(catchError(() => of({ items: [] }))),
      protocols:   this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`)
        .pipe(catchError(() => of({ items: [] }))),
      sites:       this.http.get<any>(`${environment.apiUrl}/sites?pageSize=200`)
        .pipe(catchError(() => of({ items: [] })))
    }).subscribe(({ assignments, protocols, sites }) => {
      (protocols.items ?? []).forEach((p: any) => this.protocolMap[p.protocolID] = p.title);
      (sites.items ?? []).forEach((s: any) => this.siteMap[s.siteID] = s.name);
      this.myAssignments  = assignments.items ?? [];
      this.lookupsLoading = false;
    });
  }

  // ── Level 2: Load patients enrolled in selected protocol ───────────────────
  selectProtocol(assignment: any) {
    this.selectedAssignment = assignment;
    this.view           = 'patients';
    this.patientsLoading = true;
    this.enrolledPatients = [];

    forkJoin({
      enrollments: this.http.get<any>(`${environment.apiUrl}/enrollments?pageSize=200`)
        .pipe(catchError(() => of({ items: [] }))),
      patients:    this.http.get<any>(`${environment.apiUrl}/patients?pageSize=200`)
        .pipe(catchError(() => of({ items: [] })))
    }).subscribe(({ enrollments, patients }) => {
      (patients.items ?? []).forEach((p: any) => this.patientMap[p.patientID] = p);
      this.enrolledPatients = (enrollments.items ?? [])
        .filter((e: any) => e.siteProtocolID === assignment.siteProtocolID);
      this.patientsLoading = false;
    });
  }

  // ── Level 3: Load visits for selected patient enrollment ──────────────────
  selectPatient(enrollment: any) {
    this.selectedEnrollment = enrollment;
    this.view         = 'visits';
    this.visitsLoading = true;
    this.visits       = [];

    this.http.get<any>(`${environment.apiUrl}/visits?enrollmentId=${enrollment.enrollmentID}&pageSize=200`)
      .pipe(catchError(() => of({ items: [] })))
      .subscribe(r => {
        this.visits        = r.items ?? [];
        this.visitsLoading = false;
      });
  }

  // ── Breadcrumb navigation ──────────────────────────────────────────────────
  goToProtocols() {
    this.view               = 'protocols';
    this.selectedAssignment = null;
    this.selectedEnrollment = null;
    this.enrolledPatients   = [];
    this.visits             = [];
  }

  goToPatients() {
    this.view               = 'patients';
    this.selectedEnrollment = null;
    this.visits             = [];
  }

  /** Back button — goes up one level, or to the dashboard from Level 1. */
  handleBack() {
    if (this.view === 'visits')    { this.goToPatients();  return; }
    if (this.view === 'patients')  { this.goToProtocols(); return; }
    this.nav.back('/dashboard/investigator');
  }

  goBack() { this.nav.back('/dashboard/investigator'); }

  // ── Helpers ────────────────────────────────────────────────────────────────
  protocolName(id: number) { return this.protocolMap[id] ?? `Protocol #${id}`; }
  siteName(id: number)     { return this.siteMap[id]     ?? `Site #${id}`; }
  patientName(id: number)  { return this.patientMap[id]?.name ?? `Patient #${id}`; }

  assignmentStatusClass(s: string): string {
    const m: Record<string, string> = {
      Active: 'badge-green', Pending: 'badge-amber',
      Suspended: 'badge-red', Completed: 'badge-blue'
    };
    return m[s] ?? 'badge-slate';
  }

  enrollmentStatusClass(s: string): string {
    const m: Record<string, string> = {
      Active: 'badge-green', Completed: 'badge-blue',
      Screening: 'badge-cyan', Withdrawn: 'badge-red'
    };
    return m[s] ?? 'badge-slate';
  }

  visitStatusClass(s: string): string {
    const m: Record<string, string> = {
      Completed: 'badge-green', Scheduled: 'badge-blue',
      Missed: 'badge-amber',   Cancelled: 'badge-red'
    };
    return m[s] ?? 'badge-slate';
  }

  isCompleted(visit: any) { return visit.status === 'Completed'; }

  // ── Add Visit ──────────────────────────────────────────────────────────────
  get af() { return this.addForm.controls; }

  openAddModal() {
    this.addForm.reset({ status: 'Scheduled' });
    this.addError   = '';
    this.addSuccess = '';
    this.showAddModal = true;
  }
  closeAddModal() { this.showAddModal = false; }

  submitAdd() {
    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    this.addSubmitting = true;
    this.addError = '';

    const v = this.addForm.value;
    const payload = {
      enrollmentID: this.selectedEnrollment.enrollmentID,
      visitDate:    v.visitDate,
      status:       v.status,
      notes:        v.notes || ''
    };

    this.http.post<{ visitID: number }>(`${environment.apiUrl}/visits`, payload).subscribe({
      next: (res) => {
        this.visits.push({
          visitID:      res.visitID,
          enrollmentID: payload.enrollmentID,
          visitDate:    payload.visitDate,
          status:       payload.status,
          notes:        payload.notes
        });

        // Notify patient about their scheduled visit
        const patientID     = this.selectedEnrollment?.patientID;
        const patientUserID = this.patientMap[patientID]?.userID;
        if (patientUserID && payload.status === 'Scheduled') {
          const dLabel = new Date(payload.visitDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
          const proto  = this.protocolName(this.selectedAssignment?.protocolID);
          this.http.post(`${environment.apiUrl}/notifications`, {
            userID:   patientUserID,
            message:  `A visit has been scheduled for you on ${dLabel} for ${proto}. Please plan to attend.`,
            category: 'Visit Scheduled'
          }).subscribe();
        }

        this.addSuccess    = 'Visit added successfully.';
        this.addSubmitting = false;
        setTimeout(() => this.closeAddModal(), 1200);
      },
      error: err => {
        this.addError      = err?.error?.error ?? err?.error?.message ?? 'Failed to add visit.';
        this.addSubmitting = false;
      }
    });
  }

  // ── Edit Visit ─────────────────────────────────────────────────────────────
  get ef() { return this.editForm.controls; }

  openEditModal(visit: any) {
    this.editingVisit = visit;
    this.editForm.patchValue({
      visitDate: visit.visitDate ? visit.visitDate.substring(0, 10) : '',
      status:    visit.status ?? 'Scheduled',
      notes:     visit.notes  ?? ''
    });
    this.editError   = '';
    this.editSuccess = '';
    this.showEditModal = true;
  }
  closeEditModal() { this.showEditModal = false; this.editingVisit = null; }

  submitEdit() {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    this.editSubmitting = true;
    this.editError = '';

    const v = this.editForm.value;
    const payload = { visitDate: v.visitDate, status: v.status, notes: v.notes || '' };

    this.http.put<void>(`${environment.apiUrl}/visits/${this.editingVisit.visitID}`, payload).subscribe({
      next: () => {
        Object.assign(this.editingVisit, payload);

        // Notify patient if visit marked as Missed
        if (payload.status === 'Missed') {
          const patientID     = this.selectedEnrollment?.patientID;
          const patientUserID = this.patientMap[patientID]?.userID;
          if (patientUserID) {
            const dLabel = new Date(payload.visitDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            const proto  = this.protocolName(this.selectedAssignment?.protocolID);
            this.http.post(`${environment.apiUrl}/notifications`, {
              userID:   patientUserID,
              message:  `Your visit on ${dLabel} for ${proto} was marked as missed. Please contact your investigator to reschedule.`,
              category: 'Missed Visit'
            }).subscribe();
          }
        }

        this.editSuccess    = 'Visit updated successfully.';
        this.editSubmitting = false;
        setTimeout(() => this.closeEditModal(), 1200);
      },
      error: err => {
        this.editError      = err?.error?.error ?? err?.error?.message ?? 'Failed to update visit.';
        this.editSubmitting = false;
      }
    });
  }
}
