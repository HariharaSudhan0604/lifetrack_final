import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { environment } from '../../../../../../../environments/environment';

/** End date must be on or after start date (both optional individually). */
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value;
  const end   = group.get('endDate')?.value;
  if (start && end && end < start) {
    return { dateRange: 'End date must be on or after start date.' };
  }
  return null;
}

@Component({
  selector: 'app-ctm-protocols-page',
  standalone: false,
  templateUrl: './ctm-protocols-page.component.html',
  styleUrls: ['./ctm-protocols-page.component.css']
})
export class CtmProtocolsPageComponent implements OnInit, OnDestroy {

  // ── List state ─────────────────────────────────────────────────────────────
  protocolList: any[] = [];
  listLoading     = false;
  listPage        = 1;
  listPageSize    = 10;
  listTotalCount  = 0;
  listTotalPages  = 1;
  searchTerm      = '';
  filterStatus    = '';
  private searchTimer: any;

  readonly phases   = ['Preclinical', 'Phase1', 'Phase2', 'Phase3', 'Phase4'];
  readonly statuses          = ['Draft', 'Upcoming', 'Active', 'Paused', 'Completed', 'Terminated']; // filter
  readonly editStatuses      = ['Draft', 'Upcoming', 'Active', 'Paused', 'Completed', 'Terminated']; // full list
  availableEditStatuses: string[] = this.editStatuses.slice(); // filtered by date in edit modal

  // ── Create modal ───────────────────────────────────────────────────────────
  showCreateModal  = false;
  createForm!: FormGroup;
  createSubmitting = false;
  createError      = '';
  createSuccess    = false;

  // ── Edit modal ─────────────────────────────────────────────────────────────
  showEditModal               = false;
  editingItem: any            = null;
  editForm!: FormGroup;
  editSubmitting              = false;
  editError                   = '';
  editSuccess                 = false;
  editProtocolHasAssignments  = false;
  editCheckingAssignments     = false;

  // ── Delete modal ───────────────────────────────────────────────────────────
  showDeleteConfirm = false;
  deletingItem: any = null;
  deleteLoading     = false;
  deleteError       = '';

  // ── Assign modal ───────────────────────────────────────────────────────────
  showAssignModal    = false;
  assigningProtocol: any = null;
  assignForm!: FormGroup;
  assignSubmitting   = false;
  assignError        = '';
  assignSuccess      = false;
  minInitiationDate  = '';
  maxInitiationDate  = '';
  siteOptions: any[]         = [];
  investigatorOptions: any[] = [];
  dropdownsLoading           = false;

  readonly assignStatuses = ['Pending', 'Active', 'Suspended', 'Completed'];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private router: Router,
    private nav: NavigationService
  ) {}

  ngOnInit() {
    this.createForm = this.fb.group({
      title:     ['', [Validators.required, Validators.minLength(3), Validators.maxLength(300)]],
      startDate: ['', Validators.required],
      endDate:   ['']
      // status auto-calculated from dates — not shown in form
    }, { validators: dateRangeValidator });

    this.editForm = this.fb.group({
      title:     ['', [Validators.required, Validators.minLength(3), Validators.maxLength(300)]],
      startDate: ['', Validators.required],
      endDate:   [''],
      status:    ['', Validators.required]
    }, { validators: dateRangeValidator });

    // When dates change: update allowed statuses and auto-set the date-derived status
    const syncStatus = () => {
      const start = this.editForm.get('startDate')?.value;
      const end   = this.editForm.get('endDate')?.value;
      if (!start) return;
      this.availableEditStatuses = this.computeEditStatuses(start, end);
      const derived = this.deriveProtocolStatus(start, end);
      const current = this.editForm.get('status')?.value;
      if (!this.availableEditStatuses.includes(current)) {
        this.editForm.get('status')?.setValue(derived, { emitEvent: false });
      }
    };
    this.editForm.get('startDate')!.valueChanges.subscribe(syncStatus);
    this.editForm.get('endDate')!.valueChanges.subscribe(syncStatus);

    this.assignForm = this.fb.group({
      siteID:         ['', Validators.required],
      investigatorID: ['', Validators.required],
      phase:          ['', Validators.required],
      initiationDate: [''],
      status:         ['Pending', Validators.required]
    });

    this.loadProtocols(1);
  }

  goBack() { this.nav.back('/dashboard/ctm'); }

  // ── Search / Filter ────────────────────────────────────────────────────────
  onSearch(value: string) {
    this.searchTerm = value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadProtocols(1), 400);
  }

  onFilterChange() { this.loadProtocols(1); }

  clearFilters() {
    this.searchTerm = '';
    this.filterStatus = '';
    this.loadProtocols(1);
  }

  // ── List ───────────────────────────────────────────────────────────────────
  loadProtocols(page: number) {
    this.listLoading = true;
    this.listPage    = page;
    const qs = new URLSearchParams({ page: String(page), pageSize: String(this.listPageSize) });
    if (this.searchTerm.trim()) qs.set('search', this.searchTerm.trim());
    if (this.filterStatus) qs.set('status', this.filterStatus);

    this.http.get<any>(`${environment.apiUrl}/protocols?${qs}`).subscribe({
      next: r => {
        this.protocolList   = r.items ?? [];
        this.listTotalCount = r.totalCount ?? 0;
        this.listTotalPages = r.totalPages ?? 1;
        this.listLoading    = false;
      },
      error: () => { this.listLoading = false; }
    });
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.listTotalPages }, (_, i) => i + 1);
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  openCreateModal() {
    this.createForm.reset();
    this.createError = ''; this.createSuccess = false;
    this.showCreateModal = true;
  }

  closeCreateModal() {
    if (this.createSubmitting) return;
    this.showCreateModal = false;
  }

  onSubBackdrop(e: MouseEvent, closer: () => void) {
    if ((e.target as HTMLElement).classList.contains('sub-backdrop')) closer();
  }

  private deriveProtocolStatus(startDate: string, endDate?: string): string {
    const today = new Date().toISOString().substring(0, 10);
    if (startDate > today) return 'Upcoming';
    if (endDate && today > endDate) return 'Completed';
    return 'Active';
  }

  private computeEditStatuses(startDate: string, endDate?: string): string[] {
    const today  = new Date().toISOString().substring(0, 10);
    const manual = ['Draft', 'Paused', 'Terminated'];
    if (!startDate) return this.editStatuses.slice();
    if (startDate > today)                         return [...manual, 'Upcoming'];
    if (endDate && today > endDate)                return [...manual, 'Completed'];
    return [...manual, 'Active'];
  }

  submitCreate() {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    this.createSubmitting = true; this.createError = '';
    const v = this.createForm.value;
    const autoStatus = this.deriveProtocolStatus(v.startDate, v.endDate);
    const body: any = {
      title: v.title.trim(),
      startDate: v.startDate, status: autoStatus
    };
    if (v.endDate) body.endDate = v.endDate;

    this.http.post(`${environment.apiUrl}/protocols`, body).subscribe({
      next: () => {
        this.createSubmitting = false; this.createSuccess = true;
        this.listTotalCount++;
        setTimeout(() => {
          this.showCreateModal = false; this.createSuccess = false;
          this.loadProtocols(this.listPage);
        }, 1500);
      },
      error: err => {
        this.createSubmitting = false;
        this.createError = err?.error?.error ?? err?.error?.message ?? 'Failed to create protocol.';
      }
    });
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  openEditModal(p: any) {
    this.editingItem                = p;
    this.editProtocolHasAssignments = false;
    this.editCheckingAssignments    = true;

    const startInput = this.toDateInput(p.startDate);
    const endInput   = p.endDate ? this.toDateInput(p.endDate) : '';
    this.availableEditStatuses = this.computeEditStatuses(startInput, endInput);

    this.editForm.patchValue({
      title:     p.title,
      startDate: startInput,
      endDate:   endInput,
      status:    p.status
    });
    this.editError = ''; this.editSuccess = false;
    this.showEditModal = true;

    // Check if this protocol has any site assignments to decide whether "Terminated" is allowed
    this.http.get<any>(`${environment.apiUrl}/site-protocols?protocolId=${p.protocolID}&pageSize=1`).subscribe({
      next: r => {
        this.editProtocolHasAssignments = (r.totalCount ?? 0) > 0;
        this.editCheckingAssignments    = false;
        // Allow keeping an existing "Terminated" status unchanged
        if (this.editProtocolHasAssignments && this.editForm.get('status')?.value === 'Terminated') {
          this.editProtocolHasAssignments = false;
        }
      },
      error: () => { this.editCheckingAssignments = false; }
    });
  }

  closeEditModal() {
    if (this.editSubmitting) return;
    this.showEditModal = false; this.editingItem = null;
  }

  submitEdit() {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    this.editSubmitting = true; this.editError = '';
    const v = this.editForm.value;
    const body: any = {
      title: v.title.trim(),
      startDate: v.startDate, status: v.status
    };
    if (v.endDate) body.endDate = v.endDate;

    this.http.put<any>(`${environment.apiUrl}/protocols/${this.editingItem.protocolID}`, body).subscribe({
      next: updated => {
        this.editSubmitting = false; this.editSuccess = true;
        const idx = this.protocolList.findIndex(p => p.protocolID === this.editingItem.protocolID);
        if (idx > -1) this.protocolList[idx] = updated;
        setTimeout(() => {
          this.showEditModal = false; this.editSuccess = false; this.editingItem = null;
        }, 1500);
      },
      error: err => {
        this.editSubmitting = false;
        this.editError = err?.error?.error ?? err?.error?.message ?? 'Failed to update protocol.';
      }
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  openDeleteConfirm(p: any) {
    this.deletingItem = p; this.deleteError = '';
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm() {
    if (this.deleteLoading) return;
    this.showDeleteConfirm = false; this.deletingItem = null;
  }

  confirmDelete() {
    if (!this.deletingItem) return;
    this.deleteLoading = true; this.deleteError = '';
    this.http.delete(`${environment.apiUrl}/protocols/${this.deletingItem.protocolID}`).subscribe({
      next: () => {
        this.deleteLoading = false; this.showDeleteConfirm = false; this.deletingItem = null;
        this.listTotalCount = Math.max(0, this.listTotalCount - 1);
        const newPages   = Math.ceil(this.listTotalCount / this.listPageSize) || 1;
        this.loadProtocols(this.listPage > newPages ? newPages : this.listPage);
      },
      error: err => {
        this.deleteLoading = false;
        this.deleteError = err?.error?.error ?? err?.error?.message ?? 'Failed to delete protocol.';
      }
    });
  }

  // ── Assign ─────────────────────────────────────────────────────────────────
  openAssignModal(p: any) {
    this.assigningProtocol = p;
    this.assignError = ''; this.assignSuccess = false;
    this.assignForm.reset({ status: 'Pending' });

    // Compute allowed date range: from later of (today, startDate) to endDate
    // Handle both camelCase (startDate) and PascalCase (StartDate) from API
    const today      = new Date().toISOString().substring(0, 10);
    const rawStart   = p.startDate ?? p.StartDate ?? null;
    const rawEnd     = p.endDate   ?? p.EndDate   ?? null;
    const protoStart = rawStart ? rawStart.substring(0, 10) : today;
    this.minInitiationDate = protoStart > today ? protoStart : today;
    this.maxInitiationDate = rawEnd ? rawEnd.substring(0, 10) : '';

    this.showAssignModal = true;
    this.loadDropdowns();
  }

  closeAssignModal() {
    if (this.assignSubmitting) return;
    this.showAssignModal = false; this.assigningProtocol = null;
  }

  loadDropdowns() {
    this.dropdownsLoading = true;
    forkJoin({
      sites: this.http.get<any>(`${environment.apiUrl}/sites?pageSize=200`),
      users: this.http.get<any>(`${environment.apiUrl}/users?pageSize=200`)
    }).subscribe({
      next: ({ sites, users }) => {
        this.siteOptions = sites.items ?? [];
        this.investigatorOptions = (users.items ?? []).filter((u: any) => u.role === 'Investigator' && u.isActive);
        this.dropdownsLoading = false;
      },
      error: () => { this.dropdownsLoading = false; }
    });
  }

  submitAssign() {
    if (this.assignForm.invalid) { this.assignForm.markAllAsTouched(); return; }
    this.assignSubmitting = true; this.assignError = '';
    const v = this.assignForm.value;
    const body: any = {
      protocolID:     this.assigningProtocol.protocolID,
      siteID:         Number(v.siteID),
      investigatorID: Number(v.investigatorID),
      phase:          v.phase,
      status:         v.status
    };
    if (v.initiationDate) body.initiationDate = v.initiationDate;

    this.http.post(`${environment.apiUrl}/site-protocols`, body).subscribe({
      next: () => {
        this.assignSubmitting = false; this.assignSuccess = true;
        setTimeout(() => { this.showAssignModal = false; this.assignSuccess = false; this.assigningProtocol = null; }, 1500);
      },
      error: err => {
        this.assignSubmitting = false;
        this.assignError = err?.error?.error ?? err?.error?.message ?? 'Failed to create assignment.';
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  statusClass(s: string): string {
    const m: Record<string, string> = {
      Active: 'badge-green', Upcoming: 'badge-blue', Draft: 'badge-slate',
      Paused: 'badge-amber', Completed: 'badge-cyan', Terminated: 'badge-red'
    };
    return m[s] ?? 'badge-slate';
  }

  phaseClass(p: string): string {
    const m: Record<string, string> = {
      Preclinical: 'badge-slate', Phase1: 'badge-cyan',
      Phase2: 'badge-blue', Phase3: 'badge-purple', Phase4: 'badge-green'
    };
    return m[p] ?? 'badge-slate';
  }

  assignStatusClass(s: string): string {
    const m: Record<string, string> = {
      Active: 'badge-green', Pending: 'badge-amber',
      Suspended: 'badge-red', Completed: 'badge-blue'
    };
    return m[s] ?? 'badge-slate';
  }

  toDateInput(iso: string): string {
    return iso ? iso.substring(0, 10) : '';
  }

  cf(n: string) { return this.createForm.get(n)!; }
  ef(n: string) { return this.editForm.get(n)!; }
  af(n: string) { return this.assignForm.get(n)!; }

  fieldErr(ctrl: any): string {
    if (!ctrl.touched || ctrl.valid) return '';
    if (ctrl.errors?.['required'])  return 'This field is required.';
    if (ctrl.errors?.['minlength']) return `Minimum ${ctrl.errors['minlength'].requiredLength} characters required.`;
    if (ctrl.errors?.['maxlength']) return `Maximum ${ctrl.errors['maxlength'].requiredLength} characters allowed.`;
    return 'Invalid value.';
  }

  /** Returns the cross-field date-range error message for a form, or empty string. */
  dateRangeErr(form: FormGroup): string {
    const touched = form.get('startDate')?.touched || form.get('endDate')?.touched;
    if (!touched) return '';
    return form.errors?.['dateRange'] ?? '';
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
  }
}


