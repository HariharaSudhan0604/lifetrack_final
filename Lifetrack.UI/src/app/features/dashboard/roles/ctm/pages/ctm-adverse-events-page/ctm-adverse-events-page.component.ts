import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { environment } from '../../../../../../../environments/environment';

interface AdverseEvent {
  eventID: number;
  patientID: number;
  protocolID: number;
  description: string;
  severity: string;
  status: string;
  reportedDate: string;
}

interface Protocol {
  protocolID: number;
  title: string;
}

interface Patient {
  patientID: number;
  name: string;
}

@Component({
  selector: 'app-ctm-adverse-events-page',
  standalone: false,
  templateUrl: './ctm-adverse-events-page.component.html',
  styleUrls: ['./ctm-adverse-events-page.component.css']
})
export class CtmAdverseEventsPageComponent implements OnInit {
  adverseEvents: AdverseEvent[] = [];
  filteredEvents: AdverseEvent[] = [];
  protocolMap: { [id: number]: string } = {};
  patientMap: { [id: number]: string } = {};

  loading = false;
  submitting = false;
  error = '';
  success = '';

  selectedStatus = '';
  statusOptions = ['All', 'Open', 'Under Review', 'Resolved'];

  showEditModal = false;
  selectedAE: AdverseEvent | null = null;
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

    const protocols$ = this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`);
    const patients$ = this.http.get<any>(`${environment.apiUrl}/patients?pageSize=200`);
    const events$ = this.http.get<any>(`${environment.apiUrl}/adverse-events?pageSize=200`);

    let loaded = 0;
    const checkDone = () => {
      loaded++;
      if (loaded === 3) {
        this.loading = false;
        this.applyFilter();
      }
    };

    protocols$.subscribe({
      next: (res) => {
        const items: Protocol[] = res.items ?? [];
        items.forEach(p => this.protocolMap[p.protocolID] = p.title);
        checkDone();
      },
      error: () => { this.error = 'Failed to load protocols.'; this.loading = false; }
    });

    patients$.subscribe({
      next: (res) => {
        const items: Patient[] = res.items ?? [];
        items.forEach(p => this.patientMap[p.patientID] = p.name);
        checkDone();
      },
      error: () => { this.error = 'Failed to load patients.'; this.loading = false; }
    });

    events$.subscribe({
      next: (res) => {
        this.adverseEvents = res.items ?? [];
        checkDone();
      },
      error: () => { this.error = 'Failed to load adverse events.'; this.loading = false; }
    });
  }

  applyFilter(): void {
    if (!this.selectedStatus || this.selectedStatus === 'All') {
      this.filteredEvents = [...this.adverseEvents];
    } else {
      this.filteredEvents = this.adverseEvents.filter(ae => ae.status === this.selectedStatus);
    }
  }

  clearFilter(): void {
    this.selectedStatus = '';
    this.applyFilter();
  }

  onStatusFilterChange(): void {
    this.applyFilter();
  }

  severityClass(severity: string): string {
    if (severity === 'Critical' || severity === 'Severe') return 'badge-red';
    if (severity === 'Moderate') return 'badge-amber';
    if (severity === 'Mild') return 'badge-green';
    return 'badge-slate';
  }

  statusClass(status: string): string {
    if (status === 'Open') return 'badge-red';
    if (status === 'Under Review') return 'badge-amber';
    if (status === 'Resolved') return 'badge-green';
    return 'badge-slate';
  }

  openEditModal(ae: AdverseEvent): void {
    this.selectedAE = { ...ae };
    this.editStatus = ae.status;
    this.success = '';
    this.error = '';
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedAE = null;
    this.editStatus = '';
  }

  saveEdit(): void {
    if (!this.selectedAE) return;
    this.submitting = true;
    this.error = '';
    this.success = '';

    const payload = {
      patientID:    this.selectedAE.patientID,
      protocolID:   this.selectedAE.protocolID,
      description:  this.selectedAE.description,
      severity:     this.selectedAE.severity,
      status:       this.editStatus,
      reportedDate: this.selectedAE.reportedDate
    };
    this.http.put(`${environment.apiUrl}/adverse-events/${this.selectedAE.eventID}`, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.success = 'Adverse event updated successfully.';
        const idx = this.adverseEvents.findIndex(ae => ae.eventID === this.selectedAE!.eventID);
        if (idx !== -1) {
          this.adverseEvents[idx].status = this.editStatus;
        }
        this.applyFilter();
        setTimeout(() => this.closeEditModal(), 1200);
      },
      error: () => {
        this.submitting = false;
        this.error = 'Failed to update adverse event.';
      }
    });
  }

  goBack(): void {
    this.nav.back('/dashboard/ctm');
  }
}
