import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { environment } from '../../../../../../../environments/environment';

@Component({
  selector: 'app-ctm-assignments-page',
  standalone: false,
  templateUrl: './ctm-assignments-page.component.html',
  styleUrls: ['./ctm-assignments-page.component.css']
})
export class CtmAssignmentsPageComponent implements OnInit {

  // ── Lookup maps ────────────────────────────────────────────────────────────
  protocolMap: Record<number, string>     = {};
  siteMap: Record<number, string>         = {};
  investigatorMap: Record<number, string> = {};
  investigatorOptions: any[]              = [];
  lookupsReady = false;

  // ── List state ─────────────────────────────────────────────────────────────
  assignmentList: any[] = [];
  listLoading    = false;
  listPage       = 1;
  listPageSize   = 10;
  listTotalCount = 0;
  listTotalPages = 1;
  filterStatus   = '';

  readonly statuses = ['Pending', 'Active', 'Suspended', 'Completed'];

  // ── Edit modal ─────────────────────────────────────────────────────────────
  showEditModal  = false;
  editingItem: any = null;
  editForm!: FormGroup;
  editSubmitting = false;
  editError      = '';
  editSuccess    = false;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private router: Router,
    private nav: NavigationService
  ) {}

  ngOnInit() {
    this.editForm = this.fb.group({
      investigatorID: ['', Validators.required],
      initiationDate: [''],
      status:         ['', Validators.required]
    });

    forkJoin({
      protocols: this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=500`),
      sites:     this.http.get<any>(`${environment.apiUrl}/sites?pageSize=500`),
      users:     this.http.get<any>(`${environment.apiUrl}/users?pageSize=500`)
    }).subscribe({
      next: ({ protocols, sites, users }) => {
        const pm: Record<number, string> = {};
        (protocols.items ?? []).forEach((p: any) => pm[p.protocolID] = p.title);
        this.protocolMap = pm;

        const sm: Record<number, string> = {};
        (sites.items ?? []).forEach((s: any) => sm[s.siteID] = s.name);
        this.siteMap = sm;

        this.investigatorOptions = (users.items ?? []).filter((u: any) => u.role === 'Investigator');
        const im: Record<number, string> = {};
        this.investigatorOptions.forEach((u: any) => im[u.userID] = u.name);
        this.investigatorMap = im;

        this.lookupsReady = true;
        this.loadAssignments(1);
      },
      error: () => {
        this.lookupsReady = true;
        this.loadAssignments(1);
      }
    });
  }

  goBack() { this.nav.back('/dashboard/ctm'); }

  onFilterChange() { this.loadAssignments(1); }

  clearFilter() { this.filterStatus = ''; this.loadAssignments(1); }

  // ── List ───────────────────────────────────────────────────────────────────
  loadAssignments(page: number) {
    this.listLoading = true;
    this.listPage    = page;
    const qs = new URLSearchParams({ page: String(page), pageSize: String(this.listPageSize) });
    if (this.filterStatus) qs.set('status', this.filterStatus);

    this.http.get<any>(`${environment.apiUrl}/site-protocols?${qs}`).subscribe({
      next: r => {
        this.assignmentList = r.items ?? [];
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

  protocolName(id: number)     { return this.protocolMap[id]     ?? `Protocol #${id}`; }
  siteName(id: number)         { return this.siteMap[id]         ?? `Site #${id}`; }
  investigatorName(id: number) { return this.investigatorMap[id] ?? `User #${id}`; }

  // ── Edit ───────────────────────────────────────────────────────────────────
  openEditModal(a: any) {
    this.editingItem = a;
    this.editForm.patchValue({
      investigatorID: a.investigatorID ?? '',
      initiationDate: a.initiationDate ? a.initiationDate.substring(0, 10) : '',
      status:         a.status
    });
    this.editError = ''; this.editSuccess = false;
    this.showEditModal = true;
  }

  closeEditModal() {
    if (this.editSubmitting) return;
    this.showEditModal = false; this.editingItem = null;
  }

  onSubBackdrop(e: MouseEvent, closer: () => void) {
    if ((e.target as HTMLElement).classList.contains('sub-backdrop')) closer();
  }

  submitEdit() {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    this.editSubmitting = true; this.editError = '';
    const v = this.editForm.value;
    const body: any = {
      investigatorID: Number(v.investigatorID),
      status:         v.status
    };
    if (v.initiationDate) body.initiationDate = v.initiationDate;

    this.http.put<any>(`${environment.apiUrl}/site-protocols/${this.editingItem.siteProtocolID}`, body).subscribe({
      next: updated => {
        this.editSubmitting = false; this.editSuccess = true;
        const idx = this.assignmentList.findIndex(a => a.siteProtocolID === this.editingItem.siteProtocolID);
        if (idx > -1) this.assignmentList[idx] = { ...this.assignmentList[idx], ...updated };
        setTimeout(() => { this.showEditModal = false; this.editSuccess = false; this.editingItem = null; }, 1500);
      },
      error: err => {
        this.editSubmitting = false;
        this.editError = err?.error?.error ?? err?.error?.message ?? 'Failed to update assignment.';
      }
    });
  }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      Active: 'badge-green', Pending: 'badge-amber',
      Suspended: 'badge-red', Completed: 'badge-blue'
    };
    return m[s] ?? 'badge-slate';
  }

  ef(n: string) { return this.editForm.get(n)!; }
}
