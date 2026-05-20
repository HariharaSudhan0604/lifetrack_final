import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { environment } from '../../../../../../../environments/environment';

@Component({
  selector: 'app-ctm-protocols-page',
  standalone: false,
  templateUrl: './ctm-protocols-page.component.html',
  styleUrls: ['./ctm-protocols-page.component.css']
})
export class CtmProtocolsPageComponent implements OnInit {

  // ── List state ─────────────────────────────────────────────────────────────
  protocolList: any[] = [];
  listLoading     = false;
  listPage        = 1;
  listPageSize    = 10;
  listTotalCount  = 0;
  listTotalPages  = 1;
  searchTerm      = '';
  filterStatus    = '';
  filterPhase     = '';
  private searchTimer: any;

  readonly phases   = ['Preclinical', 'Phase1', 'Phase2', 'Phase3', 'Phase4'];
  readonly statuses = ['Draft', 'Active', 'Paused', 'Completed', 'Terminated'];
  readonly assignStatuses = ['Pending', 'Active', 'Suspended', 'Completed'];

  // ── Create modal ───────────────────────────────────────────────────────────
  showCreateModal  = false;
  createForm!: FormGroup;
  createSubmitting = false;
  createError      = '';
  createSuccess    = false;

  // ── Edit modal ─────────────────────────────────────────────────────────────
  showEditModal  = false;
  editingItem: any = null;
  editForm!: FormGroup;
  editSubmitting = false;
  editError      = '';
  editSuccess    = false;

  // ── Assign modal ───────────────────────────────────────────────────────────
  showAssignModal    = false;
  assigningProtocol: any = null;
  assignForm!: FormGroup;
  assignSubmitting   = false;
  assignError        = '';
  assignSuccess      = false;
  siteOptions: any[]         = [];
  investigatorOptions: any[] = [];
  dropdownsLoading           = false;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private router: Router,
    private nav: NavigationService
  ) {}

  ngOnInit() {
    this.createForm = this.fb.group({
      title:     ['', [Validators.required, Validators.maxLength(300)]],
      phase:     ['', Validators.required],
      startDate: ['', Validators.required],
      endDate:   [''],
      status:    ['Draft', Validators.required]
    });

    this.editForm = this.fb.group({
      title:     ['', [Validators.required, Validators.maxLength(300)]],
      phase:     ['', Validators.required],
      startDate: ['', Validators.required],
      endDate:   [''],
      status:    ['', Validators.required]
    });

    this.assignForm = this.fb.group({
      siteID:         ['', Validators.required],
      investigatorID: ['', Validators.required],
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
    this.searchTerm = ''; this.filterStatus = ''; this.filterPhase = '';
    this.loadProtocols(1);
  }

  // ── List ───────────────────────────────────────────────────────────────────
  loadProtocols(page: number) {
    this.listLoading = true;
    this.listPage    = page;
    const qs = new URLSearchParams({ page: String(page), pageSize: String(this.listPageSize) });
    if (this.searchTerm.trim()) qs.set('search', this.searchTerm.trim());
    if (this.filterStatus) qs.set('status', this.filterStatus);
    if (this.filterPhase)  qs.set('phase', this.filterPhase);

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
    this.createForm.reset({ status: 'Draft' });
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

  submitCreate() {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    this.createSubmitting = true; this.createError = '';
    const v = this.createForm.value;
    const body: any = { title: v.title.trim(), phase: v.phase, startDate: v.startDate, status: v.status };
    if (v.endDate) body.endDate = v.endDate;

    this.http.post(`${environment.apiUrl}/protocols`, body).subscribe({
      next: () => {
        this.createSubmitting = false; this.createSuccess = true;
        this.listTotalCount++;
        setTimeout(() => { this.showCreateModal = false; this.createSuccess = false; this.loadProtocols(this.listPage); }, 1500);
      },
      error: err => {
        this.createSubmitting = false;
        this.createError = err?.error?.error ?? err?.error?.message ?? 'Failed to create protocol.';
      }
    });
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  openEditModal(p: any) {
    this.editingItem = p;
    this.editForm.patchValue({
      title: p.title, phase: p.phase,
      startDate: this.toDateInput(p.startDate),
      endDate:   p.endDate ? this.toDateInput(p.endDate) : '',
      status: p.status
    });
    this.editError = ''; this.editSuccess = false;
    this.showEditModal = true;
  }

  closeEditModal() {
    if (this.editSubmitting) return;
    this.showEditModal = false; this.editingItem = null;
  }

  submitEdit() {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    this.editSubmitting = true; this.editError = '';
    const v = this.editForm.value;
    const body: any = { title: v.title.trim(), phase: v.phase, startDate: v.startDate, status: v.status };
    if (v.endDate) body.endDate = v.endDate;

    this.http.put<any>(`${environment.apiUrl}/protocols/${this.editingItem.protocolID}`, body).subscribe({
      next: updated => {
        this.editSubmitting = false; this.editSuccess = true;
        const idx = this.protocolList.findIndex(p => p.protocolID === this.editingItem.protocolID);
        if (idx > -1) this.protocolList[idx] = updated;
        setTimeout(() => { this.showEditModal = false; this.editSuccess = false; this.editingItem = null; }, 1500);
      },
      error: err => {
        this.editSubmitting = false;
        this.editError = err?.error?.error ?? err?.error?.message ?? 'Failed to update protocol.';
      }
    });
  }

  // ── Assign ─────────────────────────────────────────────────────────────────
  openAssignModal(p: any) {
    this.assigningProtocol = p;
    this.assignError = ''; this.assignSuccess = false;
    this.assignForm.reset({ status: 'Pending' });
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
      Active: 'badge-green', Draft: 'badge-slate',
      Paused: 'badge-amber', Completed: 'badge-blue', Terminated: 'badge-red'
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

  toDateInput(iso: string): string { return iso ? iso.substring(0, 10) : ''; }

  cf(n: string) { return this.createForm.get(n)!; }
  ef(n: string) { return this.editForm.get(n)!; }
  af(n: string) { return this.assignForm.get(n)!; }

  fieldErr(ctrl: any): string {
    if (!ctrl.touched || ctrl.valid) return '';
    if (ctrl.errors?.['required'])  return 'Required.';
    if (ctrl.errors?.['maxlength']) return `Max ${ctrl.errors['maxlength'].requiredLength} characters.`;
    return 'Invalid value.';
  }
}
