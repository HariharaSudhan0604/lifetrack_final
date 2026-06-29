import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../../../environments/environment';
import { AuthService } from '../../../../../../core/services/auth.service';
import { NavigationService } from '../../../../../../core/services/navigation.service';

@Component({
  selector: 'app-investigator-deviations-page',
  standalone: false,
  templateUrl: './investigator-deviations-page.component.html',
  styleUrls: ['./investigator-deviations-page.component.css']
})
export class InvestigatorDeviationsPageComponent implements OnInit {
  loading = true;
  submitting = false;
  error = '';
  success = '';
  showModal = false;

  siteProtocols: any[] = [];      // all site-protocols (for lookup maps)
  modalSiteProtocols: any[] = []; // investigator's own protocols (for the modal dropdown)
  protocols: any[] = [];
  sites: any[] = [];
  deviations: any[] = [];

  filteredDeviations: any[] = [];
  siteProtocolIDs: Set<number> = new Set();
  searchTerm       = '';
  selectedSeverity = '';
  selectedStatus   = '';

  protocolMap: Record<number, string> = {};
  siteMap: Record<number, string> = {};
  siteProtocolMap: Record<number, any> = {};

  form = {
    siteProtocolID: '',
    description: '',
    severity: '',
    status: 'Reported'
  };

  formErrors: Record<string, string> = {};

  // ── Escalation tracking (persisted in localStorage) ───────────────────────
  private readonly LS_KEY_DEV = 'escalated_dev_ids';
  escalatedDevIds = new Set<number>();

  // ── Review modal (CTM + Regulatory Officer) ───────────────────────────────
  showReviewModal      = false;
  reviewDev: any       = null;
  reviewDevStatus      = '';
  reviewDevSaving      = false;
  reviewDevSuccess     = '';
  reviewDevError       = '';
  showEscalateConfirm  = false;

  /** Human-readable labels for status values — handles both current and legacy DB values. */
  readonly statusLabel: Record<string, string> = {
    Reported:        'Reported',
    Open:            'Reported',       // legacy DB value → normalise display
    UnderReview:     'Under Review',
    'Under Review':  'Under Review',   // legacy DB value
    Resolved:        'Resolved'
    // 'Closed' removed — not a valid deviation status
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private nav: NavigationService
  ) {}

  get isRegulatoryOfficer(): boolean {
    return this.authService.currentUser?.role === 'RegulatoryOfficer';
  }

  get isInvestigator(): boolean {
    return this.authService.currentUser?.role === 'Investigator';
  }

  get isCTM(): boolean {
    return this.authService.currentUser?.role === 'ClinicalTrialManager';
  }

  get isDataManager(): boolean {
    return this.authService.currentUser?.role === 'DataManager';
  }

  ngOnInit(): void {
    const uid = this.authService.currentUser?.userID;
    this.loadData(uid);

    try {
      const stored = JSON.parse(localStorage.getItem(this.LS_KEY_DEV) || '[]');
      this.escalatedDevIds = new Set<number>(stored);
    } catch { this.escalatedDevIds = new Set(); }
  }

  loadData(uid: number | undefined): void {
    forkJoin({
      // All site-protocols for lookup maps (protocol/site names always resolve)
      allSiteProtocols: this.http.get<any>(`${environment.apiUrl}/site-protocols?pageSize=500`).pipe(catchError(() => of({ items: [] }))),
      // Investigator's own site-protocols — used for the "Report Deviation" modal dropdown
      mySiteProtocols:  this.http.get<any>(`${environment.apiUrl}/site-protocols?investigatorId=${uid}&pageSize=100`).pipe(catchError(() => of({ items: [] }))),
      protocols:        this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`).pipe(catchError(() => of({ items: [] }))),
      sites:            this.http.get<any>(`${environment.apiUrl}/sites?pageSize=200`).pipe(catchError(() => of({ items: [] }))),
      deviations:       this.http.get<any>(`${environment.apiUrl}/deviations?pageSize=500`).pipe(catchError(() => of({ items: [] })))
    }).subscribe({
      next: ({ allSiteProtocols, mySiteProtocols, protocols, sites, deviations }) => {
        this.protocols  = protocols.items  || [];
        this.sites      = sites.items      || [];
        this.deviations = deviations.items || [];

        // Build maps from ALL site-protocols so names resolve for every deviation row
        this.siteProtocols = allSiteProtocols.items || [];
        this.buildMaps();

        // Modal dropdown: investigator's own protocols; fall back to all if none assigned
        const myItems = mySiteProtocols.items ?? [];
        this.modalSiteProtocols = myItems.length > 0 ? myItems : (allSiteProtocols.items ?? []);
        this.modalSiteProtocols.forEach((sp: any) => this.siteProtocolIDs.add(+sp.siteProtocolID));

        // All roles see all deviations — no investigator filter
        this.filteredDeviations = this.deviations;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  buildMaps(): void {
    this.protocols.forEach(p     => { this.protocolMap[+p.protocolID]           = p.title; });
    this.sites.forEach(s         => { this.siteMap[+s.siteID]                   = s.name || s.siteName; });
    this.siteProtocols.forEach(sp => { this.siteProtocolMap[+sp.siteProtocolID] = sp; });
  }

  get displayedDeviations(): any[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.filteredDeviations.filter(d => {
      const matchSeverity = !this.selectedSeverity || d.severity === this.selectedSeverity;
      const matchStatus   = !this.selectedStatus   ||
        d.status === this.selectedStatus ||
        this.statusLabel[d.status] === this.selectedStatus;
      const matchSearch   = !term ||
        this.protocolName(d).toLowerCase().includes(term) ||
        this.siteName(d).toLowerCase().includes(term) ||
        d.description?.toLowerCase().includes(term);
      return matchSeverity && matchStatus && matchSearch;
    });
  }

  clearSearch(): void {
    this.searchTerm       = '';
    this.selectedSeverity = '';
    this.selectedStatus   = '';
  }

  spLabel(sp: any): string {
    const protocol = this.protocolMap[+sp.protocolID] || `Protocol #${sp.protocolID}`;
    const site     = this.siteMap[+sp.siteID]         || `Site #${sp.siteID}`;
    return `${protocol} @ ${site}`;
  }

  openModal(): void {
    this.form = { siteProtocolID: '', description: '', severity: '', status: 'Reported' };
    this.error = '';
    this.success = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.error = '';
    this.success = '';
  }

  validateForm(): boolean {
    this.formErrors = {};
    if (!this.form.siteProtocolID) this.formErrors['siteProtocolID'] = 'Site protocol is required.';
    if (!this.form.severity)       this.formErrors['severity']       = 'Severity is required.';
    if (!this.form.description || !this.form.description.trim()) {
      this.formErrors['description'] = 'Description is required.';
    } else if (this.form.description.trim().length < 10) {
      this.formErrors['description'] = 'Description must be at least 10 characters.';
    } else if (this.form.description.trim().length > 1000) {
      this.formErrors['description'] = 'Description cannot exceed 1000 characters.';
    }
    return Object.keys(this.formErrors).length === 0;
  }

  submitDeviation(): void {
    if (!this.validateForm()) {
      this.error = 'Please fix the errors below.';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    const payload = {
      siteProtocolID: this.form.siteProtocolID,
      description: this.form.description,
      severity: this.form.severity,
      status: this.form.status
    };

    this.http.post<{ deviationID: number }>(`${environment.apiUrl}/deviations`, payload).subscribe({
      next: (res) => {
        this.deviations.push({
          deviationID:    res.deviationID,
          siteProtocolID: +payload.siteProtocolID,
          description:    payload.description,
          severity:       payload.severity,
          status:         payload.status
        });
        this.filteredDeviations = [...this.deviations];
        this.success = 'Deviation reported successfully.';
        this.submitting = false;
        setTimeout(() => this.closeModal(), 1500);
        const devMsg = `New protocol deviation reported. Severity: ${payload.severity}. ${this.protocolName({ siteProtocolID: +payload.siteProtocolID })} @ ${this.siteName({ siteProtocolID: +payload.siteProtocolID })}.`;
        this.notifyRoles('RegulatoryOfficer', devMsg, 'DeviationAlert');
        this.notifyRoles('ClinicalTrialManager', devMsg, 'DeviationAlert');
        this.notifyRoles('DataManager', devMsg, 'DeviationAlert');
      },
      error: () => {
        this.error = 'Failed to submit deviation. Please try again.';
        this.submitting = false;
      }
    });
  }

  severityClass(s: string): string {
    if (s === 'Critical' || s === 'Major') return 'badge-red';
    if (s === 'Minor') return 'badge-green';
    // Handle legacy values that may exist in the database
    if (s === 'Moderate') return 'badge-amber';
    return 'badge-default';
  }

  statusClass(s: string): string {
    // Handle both current API values and legacy values stored in older records
    if (s === 'Reported'    || s === 'Open')          return 'badge-red';
    if (s === 'UnderReview' || s === 'Under Review')  return 'badge-amber';
    if (s === 'Resolved')                              return 'badge-green';
    return 'badge-slate';
  }

  /** Human-readable label — normalises both current and legacy status values. */

  // ── Review modal (CTM + Regulatory Officer) ───────────────────────────────

  openReviewModal(dev: any): void {
    this.reviewDev        = dev;
    this.reviewDevStatus  = dev.status ?? 'Reported';
    this.reviewDevSuccess = '';
    this.reviewDevError   = '';
    this.showReviewModal  = true;
  }

  closeReviewModal(): void {
    this.showReviewModal     = false;
    this.showEscalateConfirm = false;
    this.reviewDev = null;
  }

  saveReviewDevStatus(): void {
    if (!this.reviewDev) return;
    this.reviewDevSaving  = true;
    this.reviewDevError   = '';
    this.reviewDevSuccess = '';

    const payload = {
      siteProtocolID: this.reviewDev.siteProtocolID,
      description:    this.reviewDev.description,
      severity:       this.reviewDev.severity,
      status:         this.reviewDevStatus
    };

    this.http.put<void>(`${environment.apiUrl}/deviations/${this.reviewDev.deviationID}`, payload).subscribe({
      next: () => {
        Object.assign(this.reviewDev, { status: this.reviewDevStatus });
        const original = this.deviations.find((d: any) => d.deviationID === this.reviewDev.deviationID);
        if (original) original.status = this.reviewDevStatus;
        this.reviewDevSaving  = false;
        this.reviewDevSuccess = 'Status updated successfully.';
      },
      error: () => {
        this.reviewDevSaving = false;
        this.reviewDevError  = 'Failed to update status. Please try again.';
      }
    });
  }

  escalateFromReview(): void {
    if (!this.reviewDev) return;
    this.showEscalateConfirm = false;
    this.escalateDeviation(this.reviewDev);
  }

  // ── Escalate to Regulatory Officer (CTM only) ─────────────────────────────

  escalateDeviation(dev: any): void {

    this.escalatedDevIds.add(+dev.deviationID);
    localStorage.setItem(this.LS_KEY_DEV, JSON.stringify([...this.escalatedDevIds]));

    this.http.get<any>(`${environment.apiUrl}/users?pageSize=100`).subscribe({
      next: (result) => {
        const regOfficers = (result.items || []).filter((u: any) => u.role === 'RegulatoryOfficer');
        regOfficers.forEach((user: any) => {
          this.http.post(`${environment.apiUrl}/notifications`, {
            userID:   user.userID,
            message:  `⚠ Protocol deviation escalated by CTM for regulatory review. Severity: ${dev.severity}. Protocol: ${this.protocolName(dev)}. Site: ${this.siteName(dev)}.`,
            category: 'DeviationAlert'
          }).subscribe();
        });
      },
      error: () => {}
    });
  }


  protocolName(dev: any): string {
    const sp = this.siteProtocolMap[+dev.siteProtocolID];
    return sp ? (this.protocolMap[+sp.protocolID] ?? `Protocol #${sp.protocolID}`) : `SP #${dev.siteProtocolID}`;
  }

  siteName(dev: any): string {
    const sp = this.siteProtocolMap[+dev.siteProtocolID];
    return sp ? (this.siteMap[+sp.siteID] ?? `Site #${sp.siteID}`) : '—';
  }

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
    const role = this.authService.currentUser?.role;
    if (role === 'DataManager')            this.nav.back('/dashboard/data-manager');
    else if (role === 'RegulatoryOfficer') this.nav.back('/dashboard/regulatory');
    else if (role === 'ClinicalTrialManager') this.nav.back('/dashboard/ctm');
    else                                   this.nav.back('/dashboard/investigator');
  }
}
