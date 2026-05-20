import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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

  // ── List ───────────────────────────────────────────────────────────────────
  visits: any[]                        = [];
  enrollmentMap: Record<number, any>   = {};
  patientMap: Record<number, any>      = {};
  siteProtocolMap: Record<number, any> = {};
  protocolMap: Record<number, string>  = {};
  enrollmentOptions: any[]             = [];
  loading = true;

  // ── Add Visit Modal ────────────────────────────────────────────────────────
  showModal    = false;
  form!: FormGroup;
  submitting   = false;
  error        = '';
  success      = '';
  visitStatuses = ['Scheduled', 'Completed', 'Missed', 'Cancelled'];

  // ── Edit Visit Modal ───────────────────────────────────────────────────────
  showEditModal  = false;
  editForm!: FormGroup;
  editingVisit: any = null;
  editSubmitting = false;
  editError      = '';
  editSuccess    = '';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private nav: NavigationService
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      enrollmentID: ['', Validators.required],
      visitDate:    ['', Validators.required],
      status:       ['Scheduled', Validators.required],
      notes:        ['', Validators.maxLength(500)]
    });
    this.editForm = this.fb.group({
      visitDate: ['', Validators.required],
      status:    ['', Validators.required],
      notes:     ['', Validators.maxLength(500)]
    });
    this.loadData();
  }

  loadData() {
    const uid = this.auth.currentUser?.userID;
    forkJoin({
      siteProtocols: this.http.get<any>(`${environment.apiUrl}/site-protocols?investigatorId=${uid}&pageSize=50`)
        .pipe(catchError(() => of({ items: [] }))),
      protocols:     this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`)
        .pipe(catchError(() => of({ items: [] }))),
      patients:      this.http.get<any>(`${environment.apiUrl}/patients?pageSize=200`)
        .pipe(catchError(() => of({ items: [] }))),
      enrollments:   this.http.get<any>(`${environment.apiUrl}/enrollments?pageSize=200`)
        .pipe(catchError(() => of({ items: [] }))),
      visits:        this.http.get<any>(`${environment.apiUrl}/visits?pageSize=200`)
        .pipe(catchError(() => of({ items: [] }))),
    }).subscribe(({ siteProtocols, protocols, patients, enrollments, visits }) => {
      // Build lookup maps
      (protocols.items ?? []).forEach((p: any) => this.protocolMap[p.protocolID] = p.title);
      (patients.items ?? []).forEach((p: any) => this.patientMap[p.patientID] = p);
      (siteProtocols.items ?? []).forEach((sp: any) => this.siteProtocolMap[sp.siteProtocolID] = sp);

      // Filter to my site-protocols only
      const mySpIDs = new Set<number>((siteProtocols.items ?? []).map((sp: any) => sp.siteProtocolID));
      const myEnrollments = (enrollments.items ?? []).filter((e: any) => mySpIDs.has(e.siteProtocolID));
      const myEnrollmentIDs = new Set<number>(myEnrollments.map((e: any) => e.enrollmentID));

      myEnrollments.forEach((e: any) => this.enrollmentMap[e.enrollmentID] = e);
      this.enrollmentOptions = myEnrollments;
      this.visits = (visits.items ?? []).filter((v: any) => myEnrollmentIDs.has(v.enrollmentID));
      this.loading = false;
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  get f() { return this.form.controls; }

  patientName(enrollmentID: number): string {
    const e = this.enrollmentMap[enrollmentID];
    return e ? (this.patientMap[e.patientID]?.name ?? `Patient #${e.patientID}`) : `Enrollment #${enrollmentID}`;
  }
  protocolName(enrollmentID: number): string {
    const e  = this.enrollmentMap[enrollmentID];
    if (!e) return '—';
    const sp = this.siteProtocolMap[e.siteProtocolID];
    return sp ? (this.protocolMap[sp.protocolID] ?? `Protocol #${sp.protocolID}`) : '—';
  }
  enrollmentLabel(e: any): string {
    const patient  = this.patientMap[e.patientID]?.name ?? `Patient #${e.patientID}`;
    const sp       = this.siteProtocolMap[e.siteProtocolID];
    const protocol = sp ? (this.protocolMap[sp.protocolID] ?? `Protocol #${sp.protocolID}`) : '';
    return `${patient} — ${protocol}`;
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  openModal() {
    this.form.reset({ status: 'Scheduled' });
    this.error   = '';
    this.success = '';
    this.showModal = true;
  }
  closeModal() { this.showModal = false; }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    this.error = '';

    const v = this.form.value;
    const payload: any = {
      enrollmentID: +v.enrollmentID,
      visitDate:    v.visitDate,
      status:       v.status,
      notes:        v.notes || null
    };

    this.http.post<any>(`${environment.apiUrl}/visits`, payload).subscribe({
      next: () => {
        this.success    = 'Visit added successfully.';
        this.submitting = false;
        setTimeout(() => { this.closeModal(); this.loadData(); }, 1200);
      },
      error: err => {
        this.error      = err?.error?.message ?? 'Failed to add visit. Please try again.';
        this.submitting = false;
      }
    });
  }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      Completed: 'badge-green', Scheduled: 'badge-blue',
      Missed: 'badge-amber', Cancelled: 'badge-red'
    };
    return m[s] ?? 'badge-slate';
  }

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
    const payload = { visitDate: v.visitDate, status: v.status, notes: v.notes || null };
    this.http.put<any>(`${environment.apiUrl}/visits/${this.editingVisit.visitID}`, payload).subscribe({
      next: () => {
        Object.assign(this.editingVisit, payload);
        this.editSuccess    = 'Visit updated successfully.';
        this.editSubmitting = false;
        setTimeout(() => this.closeEditModal(), 1200);
      },
      error: err => {
        this.editError      = err?.error?.message ?? 'Failed to update visit.';
        this.editSubmitting = false;
      }
    });
  }

  goBack() { this.nav.back('/dashboard/investigator'); }
}
