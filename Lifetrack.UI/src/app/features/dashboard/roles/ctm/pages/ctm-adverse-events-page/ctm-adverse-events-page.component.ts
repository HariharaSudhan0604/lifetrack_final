import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NavigationService } from '../../../../../../core/services/navigation.service';
import { AuthService } from '../../../../../../core/services/auth.service';
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
  adverseEvents: AdverseEvent[] = [];   // full list from server
  filteredEvents: AdverseEvent[] = [];  // filtered list for display  
  protocolMap: { [id: number]: string } = {};   // protocolID → title lookup
  patientMap:  { [id: number]: string } = {};

    // ── Loading/error state — UI feedback ──────────────────────────────────
  loading = false;
  error   = '';
  success = '';

    // ── Filter state — drives the search/filter bar ───────────────────────

  selectedStatus   = '';
  selectedSeverity = '';
  searchTerm       = '';
  statusOptions = ['All', 'Open', 'Under Review', 'Resolved'];

  // ── Escalation tracking (persisted in localStorage) ───────────────────────
  private readonly LS_KEY = 'escalated_ae_ids';
  escalatedAEIds = new Set<number>();

  // ── Review modal   // ── Modal state — controls which modal is open ────────────────────────

  showReviewModal    = false;
  reviewAE: AdverseEvent | null = null;
  reviewStatus       = '';
  reviewSaving       = false;
  reviewSuccess      = '';
  reviewError        = '';
  showEscalateConfirm = false;

  //Role flags ── Investigator: Report AE modal ────────────────────────────────────────
  isInvestigator      = false;
  isRegulatoryOfficer = false;
  isDataManager       = false;

  get isCTM(): boolean { return !this.isInvestigator && !this.isRegulatoryOfficer && !this.isDataManager; }
  today = new Date().toISOString().substring(0, 10);

  showReportModal  = false;
  reportSubmitting = false;
  reportError      = '';
  reportSuccess    = '';
  reportFormErrors: Record<string, string> = {};
  reportForm = { patientID: '', protocolID: '', description: '', severity: '', reportedDate: '' };

  enrolledPatients: any[] = [];
  scopeProtocols:   any[] = [];
  /** Maps patientID → Set of protocolIDs they are enrolled in (investigator scope). */
  private patientProtocolIds: Record<number, Set<number>> = {};

  constructor(
    private http:     HttpClient,
    private router:   Router,
    private nav:      NavigationService,
    private authSvc:  AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authSvc.currentUser;
    this.isInvestigator      = user?.role === 'Investigator';
    this.isRegulatoryOfficer = user?.role === 'RegulatoryOfficer';
    this.isDataManager       = user?.role === 'DataManager';
    this.loadData();

    // Load persisted escalated AE IDs
    try {
      const stored = JSON.parse(localStorage.getItem(this.LS_KEY) || '[]');
      this.escalatedAEIds = new Set<number>(stored);
    } catch { this.escalatedAEIds = new Set(); }
  }

  loadData(): void {
    this.loading = true;
    this.error   = '';
    const uid = this.authSvc.currentUser?.userID;
    // forkJoin fires multiple GET requests IN PARALLEL and waits for ALL to complete
  // Much faster than sequential requests — protocols + patients + events all load simultaneously
    forkJoin({
      protocols:     this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`).pipe(catchError(() => of({ items: [] }))),
      patients:      this.http.get<any>(`${environment.apiUrl}/patients?pageSize=200`).pipe(catchError(() => of({ items: [] }))),
      events:        this.http.get<any>(`${environment.apiUrl}/adverse-events?pageSize=200`).pipe(catchError(() => of({ items: [] }))),
      siteProtocols: this.isInvestigator
        ? this.http.get<any>(`${environment.apiUrl}/site-protocols?investigatorId=${uid}&pageSize=50`).pipe(catchError(() => of({ items: [] })))
        : of({ items: [] }),
      enrollments:   this.isInvestigator
        ? this.http.get<any>(`${environment.apiUrl}/enrollments?pageSize=200`).pipe(catchError(() => of({ items: [] })))
        : of({ items: [] }),
    }).subscribe({
      next: ({ protocols, patients, events, siteProtocols, enrollments }) => {
        const allPatients:  Patient[]  = patients.items  ?? [];
        const allProtocols: Protocol[] = protocols.items ?? [];

        allPatients.forEach(p  => this.patientMap[p.patientID]   = p.name);
        allProtocols.forEach(p => this.protocolMap[p.protocolID] = p.title);
        this.adverseEvents = events.items ?? [];

        if (this.isInvestigator) {
          const mySps         = siteProtocols.items ?? [];
          const mySpIds       = new Set(mySps.map((sp: any) => sp.siteProtocolID));
          const myProtocolIds = new Set(mySps.map((sp: any) => sp.protocolID));

          // siteProtocolID → protocolID lookup
          const spToProto: Record<number, number> = {};
          mySps.forEach((sp: any) => spToProto[sp.siteProtocolID] = sp.protocolID);

          const myEnrollments = (enrollments.items ?? []).filter((e: any) => mySpIds.has(e.siteProtocolID));
          const myPatientIds  = new Set(myEnrollments.map((e: any) => e.patientID));

          // Build patientID → Set<protocolID> from enrollments
          const ppMap: Record<number, Set<number>> = {};
          myEnrollments.forEach((e: any) => {
            const protocolId = spToProto[e.siteProtocolID];
            if (protocolId) {
              if (!ppMap[e.patientID]) ppMap[e.patientID] = new Set();
              ppMap[e.patientID].add(protocolId);
            }
          });
          this.patientProtocolIds = ppMap;

          this.enrolledPatients = allPatients.filter(p  => myPatientIds.has(p.patientID));
          this.scopeProtocols   = allProtocols.filter(p => myProtocolIds.has(p.protocolID));
        }

        this.loading = false;
        this.applyFilter();
      },
      error: () => {
        this.error   = 'Failed to load data.';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
      // Derives a new filteredEvents array from local state
  // Angular detects the new array reference and re-renders *ngFor automatically

    this.filteredEvents = this.adverseEvents.filter(ae => {
      const matchStatus   = !this.selectedStatus   || ae.status   === this.selectedStatus;
      const matchSeverity = !this.selectedSeverity || ae.severity === this.selectedSeverity;
      const matchSearch   = !this.searchTerm.trim() ||
        ae.description?.toLowerCase().includes(this.searchTerm.trim().toLowerCase()) ||
        this.patientMap[ae.patientID]?.toLowerCase().includes(this.searchTerm.trim().toLowerCase());
      return matchStatus && matchSeverity && matchSearch;
    });
  }

  clearFilter(): void {
    this.selectedStatus   = '';
    this.selectedSeverity = '';
    this.searchTerm       = '';
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
    if (status === 'Reported')     return 'badge-red';
    if (status === 'Under Review') return 'badge-amber';
    if (status === 'Resolved')     return 'badge-green';
    return 'badge-slate';
  }

  // ── Review modal ──────────────────────────────────────────────────────────
  openReviewModal(ae: AdverseEvent): void {
    this.reviewAE      = { ...ae };
    this.reviewStatus  = ae.status;
    this.reviewSuccess = '';
    this.reviewError   = '';
    this.showReviewModal = true;
  }

  closeReviewModal(): void {
    this.showReviewModal     = false;
    this.showEscalateConfirm = false;
    this.reviewAE = null;
  }

  saveReviewStatus(): void {
    if (!this.reviewAE) return;
    this.reviewSaving  = true;
    this.reviewError   = '';
    this.reviewSuccess = '';
      
    // Full replacement payload — PUT requires sending the complete resource
    // (unlike PATCH which sends only changed fields)

    const payload = {
      patientID:    this.reviewAE.patientID,
      protocolID:   this.reviewAE.protocolID,
      description:  this.reviewAE.description,
      severity:     this.reviewAE.severity,
      status:       this.reviewStatus,
      reportedDate: this.reviewAE.reportedDate
    };
  // http.put<void>(url, body) — <void> because this API returns 204 No Content
  // The URL includes the resource ID: /adverse-events/42
    this.http.put<void>(`${environment.apiUrl}/adverse-events/${this.reviewAE.eventID}`, payload).subscribe({
      next: () => {
        const original = this.adverseEvents.find(ae => ae.eventID === this.reviewAE!.eventID);
        if (original) Object.assign(original, payload);
        if (this.reviewAE) this.reviewAE.status = this.reviewStatus;
        this.applyFilter();
        this.reviewSaving  = false;
        this.reviewSuccess = 'Status updated successfully.';
      },
      error: () => {
        this.reviewSaving = false;
        this.reviewError  = 'Failed to update status.';
      }
    });
  }

  // ── Report AE modal (investigator only) ────────────────────────────────────
  openReportModal(): void {
    this.reportForm       = { patientID: '', protocolID: '', description: '', severity: '', reportedDate: '' };
    this.reportFormErrors = {};
    this.reportError      = '';
    this.reportSuccess    = '';
    this.showReportModal  = true;
  }

  closeReportModal(): void {
    this.showReportModal = false;
    this.reportError     = '';
    this.reportSuccess   = '';
  }

  validateReportForm(): boolean {
    this.reportFormErrors = {};
    if (!this.reportForm.patientID)  this.reportFormErrors['patientID']  = 'Patient is required.';
    if (!this.reportForm.protocolID) this.reportFormErrors['protocolID'] = 'Protocol is required.';
    if (!this.reportForm.severity)   this.reportFormErrors['severity']   = 'Severity is required.';
    if (!this.reportForm.description || !this.reportForm.description.trim()) {
      this.reportFormErrors['description'] = 'Description is required.';
    } else if (this.reportForm.description.trim().length < 10) {
      this.reportFormErrors['description'] = 'Description must be at least 10 characters.';
    } else if (this.reportForm.description.trim().length > 1000) {
      this.reportFormErrors['description'] = 'Description cannot exceed 1000 characters.';
    }
    if (!this.reportForm.reportedDate) {
      this.reportFormErrors['reportedDate'] = 'Reported date is required.';
    } else if (this.reportForm.reportedDate > this.today) {
      this.reportFormErrors['reportedDate'] = 'Reported date cannot be in the future.';
    }
    return Object.keys(this.reportFormErrors).length === 0;
  }

  submitReport(): void {
    if (!this.validateReportForm()) return;
    this.reportSubmitting = true;
    this.reportError      = '';
  // Build the request body — plain JS object, Angular serializes it to JSON automatically
  // + prefix converts string form values to numbers (all ngModel values are strings)
    const payload = {
      patientID:    +this.reportForm.patientID,
      protocolID:   +this.reportForm.protocolID,
      description:  this.reportForm.description.trim(),
      severity:     this.reportForm.severity,
      reportedDate: this.reportForm.reportedDate
    };

    this.http.post<{ eventID: number }>(`${environment.apiUrl}/adverse-events`, payload).subscribe({
      next: (res) => {
        // Construct the row from the form payload + server-issued ID
        this.adverseEvents.push({
          eventID:      res.eventID,
          patientID:    payload.patientID,
          protocolID:   payload.protocolID,
          description:  payload.description,
          severity:     payload.severity,
          status:       'Reported',   // backend always sets "Reported" on creation
          reportedDate: payload.reportedDate
        } as AdverseEvent);
        this.applyFilter();
        this.reportSuccess    = 'Adverse event reported successfully.';
        this.reportSubmitting = false;
        setTimeout(() => this.closeReportModal(), 1400);
        const aeMsg = `New adverse event reported. Severity: ${payload.severity}. Patient: ${this.patientMap[payload.patientID] || 'ID ' + payload.patientID}. Protocol: ${this.protocolMap[payload.protocolID] || 'ID ' + payload.protocolID}.`;
        this.notifyRoles('RegulatoryOfficer', aeMsg, 'AdverseEventAlert');
        this.notifyRoles('ClinicalTrialManager', aeMsg, 'AdverseEventAlert');
        this.notifyRoles('DataManager', aeMsg, 'AdverseEventAlert');
      },
      error: () => {
        this.reportError      = 'Failed to submit. Please try again.';
        this.reportSubmitting = false;
      }
    });
  }

  /** Protocols the currently selected patient is enrolled in (investigator form only). */
  get filteredProtocols(): any[] {
    const pid = +this.reportForm.patientID;
    if (!pid) return [];
    const protoIds = this.patientProtocolIds[pid];
    if (!protoIds || protoIds.size === 0) return [];
    return this.scopeProtocols.filter(p => protoIds.has(p.protocolID));
  }

  /** Reset the protocol selection whenever the patient changes. */
  onReportPatientChange(): void {
    this.reportForm.protocolID = '';
  }


  escalateFromReview(): void {
    if (!this.reviewAE) return;
    this.showEscalateConfirm = false;
    this.escalateAE(this.reviewAE);
  }

  // ── Escalate to Regulatory Officer (CTM only) ─────────────────────────────

  escalateAE(ae: AdverseEvent): void {

    // Mark as escalated and persist
    this.escalatedAEIds.add(ae.eventID);
    localStorage.setItem(this.LS_KEY, JSON.stringify([...this.escalatedAEIds]));

    // Notify all Regulatory Officers
    this.http.get<any>(`${environment.apiUrl}/users?pageSize=100`).subscribe({
      next: (result) => {
        const regOfficers = (result.items || []).filter((u: any) => u.role === 'RegulatoryOfficer');
        regOfficers.forEach((user: any) => {
          this.http.post(`${environment.apiUrl}/notifications`, {
            userID:   user.userID,
            message:  `⚠ Adverse event escalated by CTM for regulatory review. Severity: ${ae.severity}. Patient: ${this.patientMap[ae.patientID] || 'ID ' + ae.patientID}. Protocol: ${this.protocolMap[ae.protocolID] || 'ID ' + ae.protocolID}.`,
            category: 'AdverseEventAlert'
          }).subscribe();
        });
      },
      error: () => {}
    });
  }

  /** Fetch all users, filter by role, send notification to each. Silent on failure. */
  private notifyRoles(role: string, message: string, category: string): void {
    this.http.get<any>(`${environment.apiUrl}/users?pageSize=100`).subscribe({
      next: (result) => {
        (result.items || []).filter((u: any) => u.role === role).forEach((user: any) => {
          this.http.post(`${environment.apiUrl}/notifications`, { userID: user.userID, message, category }).subscribe();
        });
      },
      error: () => {}
    });
  }

  goBack(): void {
    if (this.isInvestigator)      this.nav.back('/dashboard/investigator');
    else if (this.isRegulatoryOfficer) this.nav.back('/dashboard/regulatory');
    else                          this.nav.back('/dashboard/ctm');
  }
}
