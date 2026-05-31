import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { environment } from '../../../../../../../environments/environment';

interface Doc {
  documentID: number;
  title:      string;
  category:   string;
  protocolID: number | null;
  version:    string;
  uploadedBy: number;
  uploadedAt: string;
  status:     string;
  notes?:     string;
}

interface Protocol { protocolID: number; title: string; }

@Component({
  selector:    'app-ctm-documents-page',
  standalone:  false,
  templateUrl: './ctm-documents-page.component.html',
  styleUrls:   ['./ctm-documents-page.component.css']
})
export class CtmDocumentsPageComponent implements OnInit {

  // ── Data ────────────────────────────────────────────────────────────────────
  documents:   Doc[]      = [];
  protocols:   Protocol[] = [];
  protocolMap: Record<number, string> = {};

  loading = true;
  error   = '';

  // ── Role ────────────────────────────────────────────────────────────────────
  isRegulatoryOfficer = false;
  isDataManager       = false;

  // ── Filters ─────────────────────────────────────────────────────────────────
  activeCategory = 'All';
  searchTerm     = '';
  statusFilter   = '';
  currentPage    = 1;
  readonly pageSize = 10;

  // ── 17 eTMF-aligned categories ──────────────────────────────────────────────
  readonly categories = [
    { value: 'Protocol',               label: 'Protocol' },
    { value: 'InformedConsent',        label: 'Informed Consent' },
    { value: 'IRBApproval',            label: 'IRB / Ethics Approval' },
    { value: 'InvestigatorsBrochure',  label: "Investigator's Brochure" },
    { value: 'DataManagementPlan',     label: 'Data Management Plan' },
    { value: 'StatisticalAnalysisPlan',label: 'Statistical Analysis Plan' },
    { value: 'SafetyReport',           label: 'Safety Report' },
    { value: 'MonitoringReport',       label: 'Monitoring Report' },
    { value: 'RegulatorySubmission',   label: 'Regulatory Submission' },
    { value: 'SiteDocument',          label: 'Site Document' },
    { value: 'TrainingRecord',         label: 'Training Record' },
    { value: 'CaseReportForm',         label: 'Case Report Form' },
    { value: 'LabDocument',            label: 'Lab Document' },
    { value: 'AdverseEventReport',     label: 'Adverse Event Report' },
    { value: 'DeviationReport',        label: 'Deviation Report' },
    { value: 'Correspondence',         label: 'Correspondence' },
    { value: 'Other',                  label: 'Other' },
  ];

  readonly categoryLabels: Record<string, string> = Object.fromEntries(
    this.categories.map(c => [c.value, c.label])
  );

  readonly categoryTabs = ['All', ...this.categories.map(c => c.value)];

  readonly categoryColors: Record<string, string> = {
    Protocol:               'cat-blue',
    InformedConsent:        'cat-green',
    IRBApproval:            'cat-purple',
    InvestigatorsBrochure:  'cat-teal',
    DataManagementPlan:     'cat-indigo',
    StatisticalAnalysisPlan:'cat-indigo',
    SafetyReport:           'cat-red',
    MonitoringReport:       'cat-amber',
    RegulatorySubmission:   'cat-purple',
    SiteDocument:           'cat-slate',
    TrainingRecord:         'cat-teal',
    CaseReportForm:         'cat-blue',
    LabDocument:            'cat-green',
    AdverseEventReport:     'cat-red',
    DeviationReport:        'cat-amber',
    Correspondence:         'cat-slate',
    Other:                  'cat-slate',
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  get filteredDocuments(): Doc[] {
    let list = this.documents;
    if (this.activeCategory !== 'All')
      list = list.filter(d => d.category === this.activeCategory);
    if (this.statusFilter)
      list = list.filter(d => d.status === this.statusFilter);
    if (this.searchTerm.trim())
      list = list.filter(d => d.title.toLowerCase().includes(this.searchTerm.trim().toLowerCase()));
    return list;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredDocuments.length / this.pageSize));
  }

  get pagedDocuments(): Doc[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDocuments.slice(start, start + this.pageSize);
  }

  countFor(cat: string): number {
    return cat === 'All'
      ? this.documents.length
      : this.documents.filter(d => d.category === cat).length;
  }

  setCategory(cat: string): void {
    this.activeCategory = cat;
    this.currentPage    = 1;
  }

  // ── Create modal ──────────────────────────────────────────────────────────
  showCreate      = false;
  createSubmitting= false;
  createError     = '';
  createForm      = { title: '', category: '', protocolID: null as number | null, version: '1.0', notes: '' };

  openCreate(): void {
    this.createForm  = { title: '', category: '', protocolID: null, version: '1.0', notes: '' };
    this.createError = '';
    this.showCreate  = true;
  }

  closeCreate(): void { this.showCreate = false; }

  submitCreate(): void {
    if (!this.createForm.title.trim() || !this.createForm.category) {
      this.createError = 'Title and category are required.';
      return;
    }
    this.createSubmitting = true;
    this.createError      = '';

    const user = this.authSvc.currentUser;
    const payload = {
      title:      this.createForm.title.trim(),
      category:   this.createForm.category,
      protocolID: this.createForm.protocolID || null,
      version:    this.createForm.version.trim() || '1.0',
      notes:      this.createForm.notes.trim() || null,
      uploadedBy: user?.userID ?? 0
    };

    this.http.post<Doc>(`${environment.apiUrl}/documents`, payload).subscribe({
      next: (created) => {
        this.documents.unshift(created);
        this.createSubmitting = false;
        this.showCreate       = false;

        // Notify Regulatory Officers
        this.http.get<any>(`${environment.apiUrl}/users?pageSize=100`).subscribe({
          next: r => (r.items || [])
            .filter((u: any) => u.role === 'RegulatoryOfficer')
            .forEach((u: any) => this.http.post(`${environment.apiUrl}/notifications`, {
              userID:   u.userID,
              message:  `New document uploaded: "${created.title}" (${this.categoryLabels[created.category] || created.category}).`,
              category: 'DocumentReview'
            }).subscribe()),
          error: () => {}
        });
      },
      error: () => {
        this.createError      = 'Failed to create document. Please try again.';
        this.createSubmitting = false;
      }
    });
  }

  // ── Edit / Review modal ───────────────────────────────────────────────────
  showEdit      = false;
  editDoc:  Doc | null = null;
  editSubmitting = false;
  editSuccess    = '';
  editError      = '';
  editStatus     = '';
  editForm       = { title: '', category: '', version: '', notes: '' };

  openEdit(doc: Doc): void {
    this.editDoc     = { ...doc };
    this.editStatus  = doc.status;
    this.editForm    = { title: doc.title, category: doc.category, version: doc.version, notes: doc.notes ?? '' };
    this.editSuccess = '';
    this.editError   = '';
    this.showEdit    = true;
  }

  closeEdit(): void { this.showEdit = false; this.editDoc = null; }

  submitEdit(): void {
    if (!this.editDoc) return;
    this.editSubmitting = true;
    this.editError      = '';
    this.editSuccess    = '';

    const user    = this.authSvc.currentUser;
    const payload = this.isRegulatoryOfficer
      ? {
          title:      this.editDoc.title,
          category:   this.editDoc.category,
          protocolID: this.editDoc.protocolID,
          version:    this.editDoc.version,
          status:     this.editStatus,
          notes:      this.editDoc.notes ?? null,
          uploadedBy: this.editDoc.uploadedBy
        }
      : {
          title:      this.editForm.title.trim(),
          category:   this.editForm.category,
          protocolID: this.editDoc.protocolID,
          version:    this.editForm.version.trim(),
          status:     this.editDoc.status,   // non-RegOfficer cannot change status
          notes:      this.editForm.notes.trim() || null,
          uploadedBy: user?.userID ?? this.editDoc.uploadedBy
        };

    this.http.put<Doc>(`${environment.apiUrl}/documents/${this.editDoc.documentID}`, payload).subscribe({
      next: (updated) => {
        const idx = this.documents.findIndex(d => d.documentID === this.editDoc!.documentID);
        if (idx !== -1) this.documents[idx] = updated;
        this.editSuccess    = 'Document saved successfully.';
        this.editSubmitting = false;
        setTimeout(() => this.closeEdit(), 1200);

        // Notify the document creator directly — no user lookup needed
        if (this.isRegulatoryOfficer && this.editDoc!.uploadedBy) {
          const docTitle = this.editDoc!.title || 'a document';
          const msg = `Your document "${docTitle}" has been reviewed — status updated to "${this.editStatus}" by the Regulatory Officer.`;
          this.http.post(`${environment.apiUrl}/notifications`, {
            userID:   this.editDoc!.uploadedBy,
            message:  msg,
            category: 'DocumentReview'
          }).subscribe({ error: () => {} });
        }
      },
      error: () => {
        this.editError      = 'Failed to save. Please try again.';
        this.editSubmitting = false;
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  protocolName(id: number | null | undefined): string {
    if (!id) return '—';
    return this.protocolMap[id] || `Protocol #${id}`;
  }

  categoryClass(cat: string): string { return this.categoryColors[cat] ?? 'cat-slate'; }

  statusClass(s: string): string {
    if (s === 'Approved')     return 'status-green';
    if (s === 'Under Review') return 'status-amber';
    if (s === 'Rejected')     return 'status-red';
    return 'status-slate';
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  constructor(
    private http:    HttpClient,
    private router:  Router,
    private nav:     NavigationService,
    private authSvc: AuthService
  ) {}

  ngOnInit(): void {
    const role = this.authSvc.currentUser?.role;
    this.isRegulatoryOfficer = role === 'RegulatoryOfficer';
    this.isDataManager       = role === 'DataManager';
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      documents: this.http.get<any>(`${environment.apiUrl}/documents?pageSize=200`).pipe(catchError(() => of({ items: [] }))),
      protocols: this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`).pipe(catchError(() => of({ items: [] }))),
    }).subscribe({
      next: ({ documents, protocols }) => {
        this.documents = documents.items ?? [];
        const protoList: Protocol[] = protocols.items ?? [];
        protoList.forEach(p => this.protocolMap[p.protocolID] = p.title);
        this.protocols = protoList;
        this.loading   = false;
      },
      error: () => { this.error = 'Failed to load documents.'; this.loading = false; }
    });
  }

  goBack(): void {
    const role = this.authSvc.currentUser?.role;
    if (role === 'DataManager')       this.nav.back('/dashboard/data-manager');
    else if (role === 'RegulatoryOfficer') this.nav.back('/dashboard/regulatory');
    else                              this.nav.back('/dashboard/ctm');
  }
}
