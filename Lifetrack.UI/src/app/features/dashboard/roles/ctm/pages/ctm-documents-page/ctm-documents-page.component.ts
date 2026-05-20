import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { environment } from '../../../../../../../environments/environment';

interface Document {
  documentID: number;
  protocolID: number;
  type: string;
  version: string;
  uploadedBy: number;
  uploadedAt: string;
  status: string;
}

interface Protocol {
  protocolID: number;
  title: string;
}

@Component({
  selector: 'app-ctm-documents-page',
  standalone: false,
  templateUrl: './ctm-documents-page.component.html',
  styleUrls: ['./ctm-documents-page.component.css']
})
export class CtmDocumentsPageComponent implements OnInit {
  documents: Document[] = [];
  filteredDocuments: Document[] = [];
  protocolMap: { [id: number]: string } = {};

  loading = false;
  submitting = false;
  error = '';
  success = '';

  selectedStatus = '';

  showEditModal = false;
  selectedDoc: Document | null = null;
  editStatus = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private nav: NavigationService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';

    let loaded = 0;
    const checkDone = () => {
      loaded++;
      if (loaded === 2) {
        this.loading = false;
        this.applyFilter();
      }
    };

    this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`).subscribe({
      next: (res) => {
        const items: Protocol[] = res.items ?? [];
        items.forEach(p => this.protocolMap[p.protocolID] = p.title);
        checkDone();
      },
      error: () => { this.error = 'Failed to load protocols.'; this.loading = false; }
    });

    this.http.get<any>(`${environment.apiUrl}/documents?pageSize=200`).subscribe({
      next: (res) => {
        this.documents = res.items ?? [];
        checkDone();
      },
      error: () => { this.error = 'Failed to load documents.'; this.loading = false; }
    });
  }

  applyFilter(): void {
    if (!this.selectedStatus || this.selectedStatus === 'All') {
      this.filteredDocuments = [...this.documents];
    } else {
      this.filteredDocuments = this.documents.filter(d => d.status === this.selectedStatus);
    }
  }

  onStatusFilterChange(): void {
    this.applyFilter();
  }

  statusClass(s: string): string {
    if (s === 'Approved') return 'badge-green';
    if (s === 'Under Review') return 'badge-amber';
    if (s === 'Pending') return 'badge-slate';
    if (s === 'Rejected') return 'badge-red';
    return 'badge-slate';
  }

  openEditModal(doc: Document): void {
    this.selectedDoc = { ...doc };
    this.editStatus = doc.status;
    this.success = '';
    this.error = '';
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedDoc = null;
    this.editStatus = '';
  }

  saveEdit(): void {
    if (!this.selectedDoc) return;
    this.submitting = true;
    this.error = '';
    this.success = '';

    const payload = {
      protocolID:  this.selectedDoc.protocolID,
      type:        this.selectedDoc.type,
      version:     this.selectedDoc.version,
      status:      this.editStatus,
      uploadedBy:  this.selectedDoc.uploadedBy
    };
    this.http.put(`${environment.apiUrl}/documents/${this.selectedDoc.documentID}`, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.success = 'Document updated successfully.';
        const idx = this.documents.findIndex(d => d.documentID === this.selectedDoc!.documentID);
        if (idx !== -1) {
          this.documents[idx].status = this.editStatus;
        }
        this.applyFilter();
        setTimeout(() => this.closeEditModal(), 1200);
      },
      error: () => {
        this.submitting = false;
        this.error = 'Failed to update document.';
      }
    });
  }

  goBack(): void {
    this.nav.back('/dashboard/ctm');
  }
}
