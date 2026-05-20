import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { AuthService } from '../../../../../../core/services/auth.service';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { environment } from '../../../../../../../environments/environment';

/** Consent date must be on or after enrollment date (consent is optional). */
function consentAfterEnrollmentValidator(group: AbstractControl): ValidationErrors | null {
  const enrollment = group.get('enrollmentDate')?.value;
  const consent    = group.get('consentDate')?.value;
  if (enrollment && consent && consent < enrollment) {
    return { consentBeforeEnrollment: 'Consent date cannot be before enrollment date.' };
  }
  return null;
}

/** Withdrawal reason is required when status = Withdrawn. */
function withdrawalReasonRequiredValidator(group: AbstractControl): ValidationErrors | null {
  const status = group.get('status')?.value;
  const reason = (group.get('withdrawalReason')?.value ?? '').trim();
  if (status === 'Withdrawn' && !reason) {
    return { withdrawalReasonRequired: 'Withdrawal reason is required when status is Withdrawn.' };
  }
  return null;
}

@Component({
  selector: 'app-investigator-enrollments-page',
  standalone: false,
  templateUrl: './investigator-enrollments-page.component.html',
  styleUrls: ['./investigator-enrollments-page.component.css']
})
export class InvestigatorEnrollmentsPageComponent implements OnInit {

  today = new Date().toISOString().substring(0, 10);

  // ── List ───────────────────────────────────────────────────────────────────
  enrollments: any[]              = [];
  patientMap: Record<number, any> = {};
  siteProtocolMap: Record<number, any> = {};
  protocolMap: Record<number, string>  = {};
  siteMap: Record<number, string>      = {};
  loading = true;

  // ── Enroll Modal ───────────────────────────────────────────────────────────
  showModal        = false;
  form!: FormGroup;
  submitting       = false;
  error            = '';
  success          = '';
  patientOptions: any[]      = [];
  siteProtocolOptions: any[] = [];
  statuses = ['Screening', 'Active', 'Completed', 'Withdrawn'];

  // ── Edit Modal ─────────────────────────────────────────────────────────────
  showEditModal    = false;
  editForm!: FormGroup;
  editingEnrollment: any = null;
  editSubmitting   = false;
  editError        = '';
  editSuccess      = '';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private nav: NavigationService
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      patientID:      ['', Validators.required],
      siteProtocolID: ['', Validators.required],
      enrollmentDate: ['', Validators.required],
      consentDate:    [''],
      status:         ['Screening', Validators.required]
    }, { validators: consentAfterEnrollmentValidator });

    this.editForm = this.fb.group({
      enrollmentDate:   ['', Validators.required],
      consentDate:      [''],
      status:           ['', Validators.required],
      withdrawalReason: ['']
    }, { validators: [consentAfterEnrollmentValidator, withdrawalReasonRequiredValidator] });
    this.loadData();
  }

  loadData() {
    const uid = this.auth.currentUser?.userID;
    forkJoin({
      siteProtocols: this.http.get<any>(`${environment.apiUrl}/site-protocols?investigatorId=${uid}&pageSize=50`)
        .pipe(catchError(() => of({ items: [] }))),
      protocols:     this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`)
        .pipe(catchError(() => of({ items: [] }))),
      sites:         this.http.get<any>(`${environment.apiUrl}/sites?pageSize=200`)
        .pipe(catchError(() => of({ items: [] }))),
      patients:      this.http.get<any>(`${environment.apiUrl}/patients?pageSize=200`)
        .pipe(catchError(() => of({ items: [] }))),
      enrollments:   this.http.get<any>(`${environment.apiUrl}/enrollments?pageSize=200`)
        .pipe(catchError(() => of({ items: [] }))),
    }).subscribe(({ siteProtocols, protocols, sites, patients, enrollments }) => {
      // Build lookup maps
      (protocols.items ?? []).forEach((p: any) => this.protocolMap[p.protocolID] = p.title);
      (sites.items ?? []).forEach((s: any) => this.siteMap[s.siteID] = s.name);
      (patients.items ?? []).forEach((p: any) => this.patientMap[p.patientID] = p);
      (siteProtocols.items ?? []).forEach((sp: any) => this.siteProtocolMap[sp.siteProtocolID] = sp);

      const mySpIDs = new Set<number>((siteProtocols.items ?? []).map((sp: any) => sp.siteProtocolID));
      this.siteProtocolOptions = siteProtocols.items ?? [];
      this.patientOptions      = patients.items ?? [];

      // Show only enrollments that belong to this investigator's site-protocols
      this.enrollments = (enrollments.items ?? []).filter((e: any) => mySpIDs.has(e.siteProtocolID));
      this.loading = false;
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  get f() { return this.form.controls; }

  protocolName(spID: number): string {
    const sp = this.siteProtocolMap[spID];
    return sp ? (this.protocolMap[sp.protocolID] ?? `Protocol #${sp.protocolID}`) : `SP #${spID}`;
  }
  siteName(spID: number): string {
    const sp = this.siteProtocolMap[spID];
    return sp ? (this.siteMap[sp.siteID] ?? `Site #${sp.siteID}`) : '';
  }
  patientName(id: number): string {
    return this.patientMap[id]?.name ?? `Patient #${id}`;
  }
  spLabel(sp: any): string {
    const pName = this.protocolMap[sp.protocolID] ?? `Protocol #${sp.protocolID}`;
    const sName = this.siteMap[sp.siteID]         ?? `Site #${sp.siteID}`;
    return `${pName} @ ${sName}`;
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  openModal() {
    this.form.reset({ status: 'Screening' });
    this.error = '';
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
      patientID:      +v.patientID,
      siteProtocolID: +v.siteProtocolID,
      enrollmentDate: v.enrollmentDate,
      status:         v.status
    };
    if (v.consentDate) payload.consentDate = v.consentDate;

    this.http.post<any>(`${environment.apiUrl}/enrollments`, payload).subscribe({
      next: () => {
        this.success    = 'Patient enrolled successfully.';
        this.submitting = false;
        setTimeout(() => { this.closeModal(); this.loadData(); }, 1200);
      },
      error: err => {
        this.error      = err?.error?.message ?? 'Failed to enroll patient. Please try again.';
        this.submitting = false;
      }
    });
  }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      Active: 'badge-green', Completed: 'badge-blue',
      Screening: 'badge-cyan', Withdrawn: 'badge-red'
    };
    return m[s] ?? 'badge-slate';
  }

  get ef() { return this.editForm.controls; }

  consentErr(form: FormGroup): string {
    const touched = form.get('consentDate')?.touched || form.get('enrollmentDate')?.touched;
    if (!touched) return '';
    return form.errors?.['consentBeforeEnrollment'] ?? '';
  }

  withdrawalErr(form: FormGroup): string {
    const touched = form.get('status')?.touched;
    if (!touched) return '';
    return form.errors?.['withdrawalReasonRequired'] ?? '';
  }

  openEditModal(enrollment: any) {
    this.editingEnrollment = enrollment;
    this.editForm.patchValue({
      enrollmentDate:   enrollment.enrollmentDate ? enrollment.enrollmentDate.substring(0, 10) : '',
      consentDate:      enrollment.consentDate    ? enrollment.consentDate.substring(0, 10)    : '',
      status:           enrollment.status         ?? 'Screening',
      withdrawalReason: enrollment.withdrawalReason ?? ''
    });
    this.editError   = '';
    this.editSuccess = '';
    this.showEditModal = true;
  }
  closeEditModal() { this.showEditModal = false; this.editingEnrollment = null; }

  submitEdit() {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    this.editSubmitting = true;
    this.editError = '';
    const v = this.editForm.value;
    const payload: any = {
      enrollmentDate: v.enrollmentDate,
      status:         v.status,
      withdrawalReason: v.withdrawalReason || null
    };
    if (v.consentDate) payload.consentDate = v.consentDate;

    this.http.put<any>(`${environment.apiUrl}/enrollments/${this.editingEnrollment.enrollmentID}`, payload).subscribe({
      next: () => {
        Object.assign(this.editingEnrollment, payload);
        this.editSuccess    = 'Enrollment updated successfully.';
        this.editSubmitting = false;
        setTimeout(() => this.closeEditModal(), 1200);
      },
      error: err => {
        this.editError      = err?.error?.message ?? 'Failed to update enrollment.';
        this.editSubmitting = false;
      }
    });
  }

  goBack() { this.nav.back('/dashboard/investigator'); }
}
