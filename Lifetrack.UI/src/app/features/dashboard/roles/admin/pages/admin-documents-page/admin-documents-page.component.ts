import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';

@Component({
  selector: 'app-admin-documents-page',
  standalone: false,
  templateUrl: './admin-documents-page.component.html',
  styleUrls: ['./admin-documents-page.component.css']
})
export class AdminDocumentsPageComponent implements OnInit {
  documents: any[] = [];
  protocols: any[] = [];
  protocolMap: { [id: number]: string } = {};

  loading = false;
  errorMsg = '';
  successMsg = '';

  selectedStatus = 'All';
  statusOptions = ['All', 'Approved', 'Under Review', 'Pending', 'Rejected'];

  showCreateModal = false;
  showEditModal = false;
  editingDoc: any = null;

  createForm!: FormGroup;
  editForm!: FormGroup;

  documentTypes = [
    'Protocol Synopsis',
    'Informed Consent Form',
    'Investigator Brochure',
    'Case Report Form',
    'Safety Monitoring Report',
    'Regulatory Submission Form',
    'Audit Report'
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private router: Router,
    private nav: NavigationService
  ) {}

  ngOnInit(): void {
    this.buildForms();
    this.loadData();
  }

  buildForms(): void {
    this.createForm = this.fb.group({
      protocolID: ['', Validators.required],
      type: ['', Validators.required],
      version: ['', Validators.required],
      status: ['Pending', Validators.required]
    });

    this.editForm = this.fb.group({
      status: ['', Validators.required]
    });
  }

  get f() {
    return this.createForm.controls;
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      protocols: this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`).pipe(catchError(() => of({ data: [] }))),
      documents: this.http.get<any>(`${environment.apiUrl}/documents?pageSize=200`).pipe(catchError(() => of({ data: [] })))
    }).subscribe({
      next: (result) => {
        this.protocols = result.protocols?.items ?? [];
        this.documents = result.documents?.items ?? [];
        this.protocols.forEach((p: any) => {
          this.protocolMap[p.protocolID ?? p.id] = p.title ?? p.name ?? 'Unknown';
        });
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to load data.';
        this.loading = false;
      }
    });
  }

  get filteredDocuments(): any[] {
    if (this.selectedStatus === 'All') return this.documents;
    return this.documents.filter(d => d.status === this.selectedStatus);
  }

  openCreateModal(): void {
    this.createForm.reset({ status: 'Pending' });
    this.successMsg = '';
    this.errorMsg = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.value;
    const payload = {
      protocolID: +v.protocolID,
      type: v.type,
      version: v.version,
      status: v.status,
      uploadedAt: new Date().toISOString()
    };
    this.http.post(`${environment.apiUrl}/documents`, payload).subscribe({
      next: (doc: any) => {
        this.documents.unshift(doc);
        this.successMsg = 'Document uploaded successfully.';
        this.showCreateModal = false;
      },
      error: () => {
        this.errorMsg = 'Failed to upload document.';
      }
    });
  }

  openEditModal(doc: any): void {
    this.editingDoc = doc;
    this.editForm.patchValue({ status: doc.status });
    this.successMsg = '';
    this.errorMsg = '';
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingDoc = null;
  }

  submitEdit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const status = this.editForm.value.status;
    const doc = this.editingDoc;
    const payload = {
      protocolID: doc.protocolID,
      type:       doc.type,
      version:    doc.version,
      status:     status,
      uploadedBy: doc.uploadedBy ?? 0
    };
    this.http.put(`${environment.apiUrl}/documents/${doc.documentID}`, payload).subscribe({
      next: () => {
        const idx = this.documents.findIndex(d => d.documentID === this.editingDoc.documentID);
        if (idx > -1) this.documents[idx].status = status;
        this.successMsg = 'Document status updated.';
        this.showEditModal = false;
        this.editingDoc = null;
      },
      error: () => {
        this.errorMsg = 'Failed to update document.';
      }
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Approved': return 'badge-green';
      case 'Under Review': return 'badge-amber';
      case 'Pending': return 'badge-slate';
      case 'Rejected': return 'badge-red';
      default: return 'badge-slate';
    }
  }

  goBack(): void {
    this.nav.back('/dashboard/admin');
  }
}
