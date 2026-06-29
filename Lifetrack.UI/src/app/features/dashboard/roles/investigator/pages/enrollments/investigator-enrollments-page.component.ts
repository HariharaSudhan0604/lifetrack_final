import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, catchError, of, switchMap } from 'rxjs';
import { AuthService } from '../../../../../../core/services/auth.service';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { environment } from '../../../../../../../environments/environment';

/** Withdrawal reason is required when status = Withdrawn. */
function withdrawalReasonRequiredValidator(group: AbstractControl): ValidationErrors | null {
  const status = group.get('status')?.value;
  const reason = (group.get('withdrawalReason')?.value ?? '').trim();
  if (status === 'Withdrawn' && !reason) {
    return { withdrawalReasonRequired: 'Withdrawal reason is required when status is Withdrawn.' };
  }
  return null;
}

/** Format ISO date string 'yyyy-mm-dd' → 'MMM d, yyyy' for display. */
function fmtDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.substring(0, 10).split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[+m - 1]} ${+d}, ${y}`;
}

@Component({
  selector: 'app-investigator-enrollments-page',
  standalone: false,
  templateUrl: './investigator-enrollments-page.component.html',
  styleUrls: ['./investigator-enrollments-page.component.css']
})
export class InvestigatorEnrollmentsPageComponent implements OnInit {

  // ── List ───────────────────────────────────────────────────────────────────
  enrollments:     any[]               = [];
  patientMap:      Record<number, any> = {};
  siteProtocolMap: Record<number, any> = {};
  protocolMap:     Record<number, string> = {};
  siteMap:         Record<number, string> = {};
  loading = true;

  // ── Filters ────────────────────────────────────────────────────────────────
  searchTerm   = '';
  filterStatus = '';

  // ── Enroll Modal ───────────────────────────────────────────────────────────
  showModal        = false;
  form!: FormGroup;
  submitting       = false;
  error            = '';
  success          = '';
  patientOptions: any[]      = [];
  siteProtocolOptions: any[] = [];
  statuses     = ['Screening', 'Enrolled', 'Active', 'Completed', 'Withdrawn']; // filter
  editStatuses = ['Screening', 'Enrolled', 'Active', 'Completed', 'Withdrawn']; // edit modal

  // ── Edit Modal ─────────────────────────────────────────────────────────────
  showEditModal    = false;
  editForm!: FormGroup;
  editingEnrollment: any = null;
  editSubmitting   = false;
  editError        = '';
  editSuccess      = '';

  // ── Date guards ────────────────────────────────────────────────────────────
  minEnrollmentDate     = '';   // create modal: driven by selected siteProtocol
  minEditEnrollmentDate = '';   // edit modal: driven by editingEnrollment's siteProtocol

  // ── Validators (arrow functions so they can access `this`) ────────────────
  private enrollmentAfterInitiationValidator = (group: AbstractControl): ValidationErrors | null => {
    const spID      = group.get('siteProtocolID')?.value;
    const enrollDate = group.get('enrollmentDate')?.value;
    if (!spID || !enrollDate) return null;
    const sp = this.siteProtocolOptions.find((s: any) => s.siteProtocolID === +spID);
    if (!sp?.initiationDate) return null;
    const initDate = sp.initiationDate.substring(0, 10);
    return enrollDate < initDate ? { enrollmentBeforeInitiation: initDate } : null;
  };

  private editEnrollmentAfterInitiationValidator = (group: AbstractControl): ValidationErrors | null => {
    if (!this.editingEnrollment) return null;
    const enrollDate = group.get('enrollmentDate')?.value;
    const sp = this.siteProtocolMap[this.editingEnrollment.siteProtocolID];
    if (!sp?.initiationDate || !enrollDate) return null;
    const initDate = sp.initiationDate.substring(0, 10);
    return enrollDate < initDate ? { enrollmentBeforeInitiation: initDate } : null;
  };

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
      enrollmentDate: ['', Validators.required]
      // status always 'Screening' for new enrollments — not shown in form
    }, { validators: this.enrollmentAfterInitiationValidator });

    this.editForm = this.fb.group({
      enrollmentDate:   ['', Validators.required],
      status:           ['', Validators.required],
      withdrawalReason: ['']
    }, { validators: [withdrawalReasonRequiredValidator, this.editEnrollmentAfterInitiationValidator] });

    // When patient changes, reset the protocol selection so stale picks are cleared
    this.form.get('patientID')!.valueChanges.subscribe(() => {
      this.form.get('siteProtocolID')?.setValue('');
      this.minEnrollmentDate = '';
      this.form.get('enrollmentDate')?.updateValueAndValidity();
    });

    // When the user picks a protocol in the create modal, update the min date
    this.form.get('siteProtocolID')!.valueChanges.subscribe((spID: any) => {
      if (!spID) { this.minEnrollmentDate = ''; return; }
      const sp = this.siteProtocolOptions.find((s: any) => s.siteProtocolID === +spID);
      this.minEnrollmentDate = sp?.initiationDate ? sp.initiationDate.substring(0, 10) : '';
      // Re-run cross-field validation after min changes
      this.form.get('enrollmentDate')?.updateValueAndValidity();
    });

    this.loadData();
  }

  loadData() {
    const uid = this.auth.currentUser?.userID;

    //fetch investigator's own site-protocols first
    this.http.get<any>(`${environment.apiUrl}/site-protocols?investigatorId=${uid}&pageSize=100`)
      .pipe(catchError(() => of({ items: [] })))
      .pipe(
        switchMap(mySiteProtocols => {
          const myIds: number[] = (mySiteProtocols.items ?? []).map((sp: any) => sp.siteProtocolID);

          // If investigator has no assigned protocols, skip the enrollments call entirely
          // to avoid fetching all enrollments from the database
          if (myIds.length === 0) {
            return forkJoin({
              mySiteProtocols: of(mySiteProtocols),
              protocols:  this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`)
                .pipe(catchError(() => of({ items: [] }))),
              sites:      this.http.get<any>(`${environment.apiUrl}/sites?pageSize=200`)
                .pipe(catchError(() => of({ items: [] }))),
              patients:   this.http.get<any>(`${environment.apiUrl}/patients?pageSize=200`)
                .pipe(catchError(() => of({ items: [] }))),
              enrollments: of({ items: [] }),   // no protocols → no enrollments
            });
          }

          const spParam = `&siteProtocolIds=${myIds.join(',')}`;

          // Step 2: fetch everything in parallel, enrollments filtered by investigator's protocols
          return forkJoin({
            mySiteProtocols: of(mySiteProtocols),
            protocols:  this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`)
              .pipe(catchError(() => of({ items: [] }))),
            sites:      this.http.get<any>(`${environment.apiUrl}/sites?pageSize=200`)
              .pipe(catchError(() => of({ items: [] }))),
            patients:   this.http.get<any>(`${environment.apiUrl}/patients?pageSize=200`)
              .pipe(catchError(() => of({ items: [] }))),
            enrollments: this.http.get<any>(`${environment.apiUrl}/enrollments?pageSize=500${spParam}`) //sending inves specific siteprot ids
              .pipe(catchError(() => of({ items: [] }))),
          });
        })
      )
      .subscribe(({ mySiteProtocols, protocols, sites, patients, enrollments }) => {
        // Build lookup maps — only investigator's protocols needed since enrollments are filtered
        (protocols.items  ?? []).forEach((p: any)  => this.protocolMap[p.protocolID]                = p.title);
        (sites.items      ?? []).forEach((s: any)  => this.siteMap[s.siteID]                        = s.name);
        (patients.items   ?? []).forEach((p: any)  => this.patientMap[p.patientID]                  = p);
        (mySiteProtocols.items ?? []).forEach((sp: any) => this.siteProtocolMap[sp.siteProtocolID]  = sp);

        // Enroll-modal dropdown: only this investigator's Active assignments
        this.siteProtocolOptions = (mySiteProtocols.items ?? []).filter((sp: any) => sp.status === 'Active');
        this.patientOptions      = patients.items ?? [];

        // Backend already filtered enrollments by siteProtocolIds — no client-side filter needed
        this.enrollments = enrollments.items ?? [];
        this.loading = false;
      });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  get f() { return this.form.controls; }

  /**
   * Protocols available for the currently selected patient in the create modal.
   * Excludes any siteProtocol the patient is already enrolled in (any status).
   */
  get availableSiteProtocols(): any[] {
    const pid = +this.form.get('patientID')?.value;
    if (!pid) return this.siteProtocolOptions;
    const alreadyEnrolled = new Set(
      this.enrollments
        .filter(e => e.patientID === pid)
        .map(e => e.siteProtocolID)
    );
    return this.siteProtocolOptions.filter(sp => !alreadyEnrolled.has(sp.siteProtocolID));
  }

  /** True when a patient is selected but all their protocols are already enrolled. */
  get allProtocolsEnrolled(): boolean {
    const pid = +this.form.get('patientID')?.value;
    if (!pid) return false;
    return this.siteProtocolOptions.length > 0 && this.availableSiteProtocols.length === 0;
  }

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

  // ── Filters ────────────────────────────────────────────────────────────────
  get filteredEnrollments(): any[] {
    let list = this.enrollments;
    if (this.filterStatus) {
      list = list.filter(e => e.status === this.filterStatus);
    }
    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(e =>
        this.patientName(e.patientID).toLowerCase().includes(term) ||
        this.protocolName(e.siteProtocolID).toLowerCase().includes(term) ||
        this.siteName(e.siteProtocolID).toLowerCase().includes(term)
      );
    }
    return list;
  }

  get hasActiveFilters(): boolean { return !!(this.searchTerm || this.filterStatus); }

  onSearch(value: string)       { this.searchTerm   = value; }
  onStatusChange(value: string) { this.filterStatus = value; }
  clearFilters() { this.searchTerm = ''; this.filterStatus = ''; }

  // ── Modal ──────────────────────────────────────────────────────────────────
  openModal() {
    this.form.reset();
    this.minEnrollmentDate = '';
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
      patientID:      +v.patientID,
      siteProtocolID: +v.siteProtocolID,
      enrollmentDate: v.enrollmentDate,
      status:         'Screening'  // always Screening for new enrollments
    };

    this.http.post<any>(`${environment.apiUrl}/enrollments`, payload).subscribe({
      next: (res: { enrollmentID: number }) => {
        // Server returns only the new enrollmentID — build the full row locally
        this.enrollments.push({
          enrollmentID:    res.enrollmentID,
          patientID:       payload.patientID,
          siteProtocolID:  payload.siteProtocolID,
          enrollmentDate:  payload.enrollmentDate,
          status:          payload.status,
          withdrawalReason: null
        });

        // Notify the patient about their enrollment
        const patient = this.patientMap[payload.patientID];
        const patientUserID = patient?.userID;
        if (patientUserID) {
          const sp = this.siteProtocolMap[payload.siteProtocolID];
          const protocolName = this.protocolMap[sp?.protocolID] ?? 'your trial';
          const siteName     = this.siteMap[sp?.siteID] ?? '';
          const msg = `You have been enrolled in ${protocolName}${siteName ? ' at ' + siteName : ''}. Welcome to the study! Your enrollment status is ${payload.status}.`;
          this.http.post(`${environment.apiUrl}/notifications`, {
            userID: patientUserID, message: msg, category: 'Enrollment'
          }).subscribe();
        }

        this.success    = 'Patient enrolled successfully.';
        this.submitting = false;
        setTimeout(() => this.closeModal(), 1200);
      },
      error: err => {
        this.error = err?.error?.message ?? 'Failed to enroll patient. Please try again.';
        this.submitting = false;
      }
    });
  }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      Active:    'badge-green',
      Enrolled:  'badge-cyan',
      Screening: 'badge-purple',
      Completed: 'badge-blue',
      Withdrawn: 'badge-red'
    };
    return m[s] ?? 'badge-slate';
  }

  get ef() { return this.editForm.controls; }

  withdrawalErr(form: FormGroup): string {
    const touched = form.get('status')?.touched;
    if (!touched) return '';
    return form.errors?.['withdrawalReasonRequired'] ?? '';
  }

  /** Returns an error message when enrollment date is before the protocol initiation date. */
  initiationDateErr(form: FormGroup): string {
    const enrollDateTouched = form.get('enrollmentDate')?.touched;
    if (!enrollDateTouched) return '';
    const initDate: string = form.errors?.['enrollmentBeforeInitiation'];
    return initDate ? `Enrollment date cannot be before the protocol's initiation date (${fmtDate(initDate)}).` : '';
  }

  openEditModal(enrollment: any) {
    this.editingEnrollment = enrollment;

    // Set min date from this enrollment's siteProtocol
    const sp = this.siteProtocolMap[enrollment.siteProtocolID];
    this.minEditEnrollmentDate = sp?.initiationDate ? sp.initiationDate.substring(0, 10) : '';

    this.editForm.patchValue({
      enrollmentDate:   enrollment.enrollmentDate ? enrollment.enrollmentDate.substring(0, 10) : '',
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

    this.http.put<any>(`${environment.apiUrl}/enrollments/${this.editingEnrollment.enrollmentID}`, payload).subscribe({
      next: () => {
        Object.assign(this.editingEnrollment, payload);

        // Notify patient when withdrawn
        if (payload.status === 'Withdrawn') {
          const patient = this.patientMap[this.editingEnrollment.patientID];
          const patientUserID = patient?.userID;
          if (patientUserID) {
            const sp           = this.siteProtocolMap[this.editingEnrollment.siteProtocolID];
            const protocolName = this.protocolMap[sp?.protocolID] ?? 'your trial';
            const reason       = payload.withdrawalReason
              ? ` Reason: ${payload.withdrawalReason}.`
              : '';
            this.http.post(`${environment.apiUrl}/notifications`, {
              userID:   patientUserID,
              message:  `You have been withdrawn from ${protocolName}.${reason} Please contact your investigator for further information.`,
              category: 'Enrollment'
            }).subscribe();
          }
        }

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

  goBack(): void {
    const role = this.auth.currentUser?.role;
    if (role === 'DataManager') this.nav.back('/dashboard/data-manager');
    else                        this.nav.back('/dashboard/investigator');
  }
}
