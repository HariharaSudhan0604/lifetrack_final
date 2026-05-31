import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Subject } from 'rxjs';
import { catchError, of, takeUntil } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { UserInfo } from '../../../../core/models/auth.models';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-patient-dashboard',
  standalone: false,
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.css']
})
export class PatientDashboardComponent implements OnInit, OnDestroy {
  user: UserInfo | null;
  private destroy$ = new Subject<void>();

  today = new Date();

  // ── Daily health quotes (cycles by day-of-year, same quote all day) ────
  private readonly healthQuotes: { text: string; author: string }[] = [
    { text: 'The greatest wealth is health.',                                                                                     author: 'Virgil' },
    { text: 'Take care of your body. It\'s the only place you have to live.',                                                    author: 'Jim Rohn' },
    { text: 'Let food be thy medicine and medicine be thy food.',                                                                 author: 'Hippocrates' },
    { text: 'The good physician treats the disease; the great physician treats the patient who has the disease.',                 author: 'William Osler' },
    { text: 'Wherever the art of medicine is loved, there is also a love of humanity.',                                          author: 'Hippocrates' },
    { text: 'To keep the body in good health is a duty, otherwise we shall not be able to keep our mind strong and clear.',      author: 'Buddha' },
    { text: 'Healing is a matter of time, but it is sometimes also a matter of opportunity.',                                    author: 'Hippocrates' },
    { text: 'Walking is man\'s best medicine.',                                                                                  author: 'Hippocrates' },
    { text: 'A calm mind brings inner strength and self-confidence, so that\'s very important for good health.',                  author: 'Dalai Lama' },
    { text: 'The first wealth is health.',                                                                                       author: 'Ralph Waldo Emerson' },
    { text: 'Health is a state of complete harmony of the body, mind and spirit.',                                               author: 'B.K.S. Iyengar' },
    { text: 'A healthy outside starts from the inside.',                                                                         author: 'Robert Urich' },
    { text: 'The art of medicine consists in keeping the patient amused while nature heals the disease.',                        author: 'Voltaire' },
    { text: 'Medicine is a science of uncertainty and an art of probability.',                                                   author: 'William Osler' },
    { text: 'The greatest medicine of all is to teach people how not to need it.',                                               author: 'Hippocrates' },
    { text: 'Strength does not come from physical capacity. It comes from an indomitable will.',                                  author: 'Mahatma Gandhi' },
    { text: 'Every patient carries her or his own doctor inside.',                                                               author: 'Albert Schweitzer' },
    { text: 'The body heals with play, the mind heals with laughter, and the spirit heals with joy.',                           author: 'Ancient Proverb' },
    { text: 'Early to bed and early to rise makes a man healthy, wealthy and wise.',                                             author: 'Benjamin Franklin' },
    { text: 'Health is not valued until sickness comes.',                                                                        author: 'Thomas Fuller' },
    { text: 'It is health that is real wealth, and not pieces of gold and silver.',                                              author: 'Mahatma Gandhi' },
    { text: 'The human body is the best picture of the human soul.',                                                             author: 'Ludwig Wittgenstein' },
    { text: 'One must eat to live, not live to eat.',                                                                            author: 'Molière' },
    { text: 'Sleep is that golden chain that ties health and our bodies together.',                                              author: 'Thomas Dekker' },
    { text: 'Your body hears everything your mind says. Stay positive.',                                                         author: 'Naomi Judd' },
  ];

  get dailyQuote(): { text: string; author: string } {
    const start    = new Date(this.today.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((this.today.getTime() - start.getTime()) / 86_400_000);
    return this.healthQuotes[dayOfYear % this.healthQuotes.length];
  }

  // ── Patient record (resolved from UserID) ─────────────────────────────────
  patientRecord: any = null;
  noPatientRecord   = false;

  // ── Data panels ───────────────────────────────────────────────────────────
  enrollments:    any[] = [];
  upcomingVisits: any[] = [];
  adverseEvents:  any[] = [];
  notifications:  any[] = [];

  // ── Lookup maps ───────────────────────────────────────────────────────────
  protocolMap:     Record<number, string> = {};
  siteProtocolMap: Record<number, any>    = {};
  siteMap:         Record<number, string> = {};

  // ── Investigator (coordinator) info ──────────────────────────────────────
  investigatorInfo: any    = null;
  investigatorLoading      = true;
  investigatorNotAssigned  = false;

  // ── Stats ─────────────────────────────────────────────────────────────────
  statsEnrollments       = 0;
  statsActiveEnrollments = 0;
  statsUpcomingVisits    = 0;
  statsNotifications     = 0;

  loading        = true;
  detailsLoading = true;
  showNotifPanel = false;

  // ── Symptom Report modal ──────────────────────────────────────────────────
  showSymptomModal   = false;
  symptomSubmitting  = false;
  symptomSuccess     = '';
  symptomError       = '';
  symptomForm        = { enrollmentID: '', description: '' };
  symptomFormErrors: Record<string, string> = {};

  constructor(private auth: AuthService, private http: HttpClient) {
    this.user = this.auth.currentUser;
  }

  ngOnInit(): void {
    const uid = this.user?.userID;

    // Phase 1: find this user's PatientRecord + load notifications
    forkJoin({
      patients:      this.http.get<any>(`${environment.apiUrl}/patients?pageSize=200`)
                       .pipe(catchError(() => of({ items: [] }))),
      notifications: this.http.get<any>(`${environment.apiUrl}/notifications/my?pageSize=50`)
                       .pipe(catchError(() => of({ items: [] }))),
    }).pipe(takeUntil(this.destroy$)).subscribe(({ patients, notifications }) => {

      this.notifications      = notifications.items ?? [];
      this.statsNotifications = this.notifications.filter((n: any) => n.status === 'Unread').length;

      const match = (patients.items ?? []).find((p: any) => p.userID === uid);
      if (!match) {
        this.noPatientRecord = true;
        this.loading         = false;
        this.detailsLoading  = false;
        return;
      }

      this.patientRecord = match;
      this.loading       = false;   // profile / stats spinner off
      this.loadClinicalData(match.patientID);
    });
  }

  private loadClinicalData(patientID: number): void {
    forkJoin({
      enrollments:   this.http.get<any>(`${environment.apiUrl}/enrollments?patientId=${patientID}&pageSize=50`)
                       .pipe(catchError(() => of({ items: [] }))),
      adverseEvents: this.http.get<any>(`${environment.apiUrl}/adverse-events?patientId=${patientID}&pageSize=50`)
                       .pipe(catchError(() => of({ items: [] }))),
      protocols:     this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`)
                       .pipe(catchError(() => of({ items: [] }))),
      siteProtocols: this.http.get<any>(`${environment.apiUrl}/site-protocols?pageSize=200`)
                       .pipe(catchError(() => of({ items: [] }))),
      sites:         this.http.get<any>(`${environment.apiUrl}/sites?pageSize=200`)
                       .pipe(catchError(() => of({ items: [] }))),
      allVisits:     this.http.get<any>(`${environment.apiUrl}/visits?pageSize=200`)
                       .pipe(catchError(() => of({ items: [] }))),
    }).pipe(takeUntil(this.destroy$)).subscribe(({ enrollments, adverseEvents, protocols, siteProtocols, sites, allVisits }) => {

      // Build lookup maps
      (protocols.items ?? []).forEach((p: any) => this.protocolMap[p.protocolID] = p.title);
      (sites.items     ?? []).forEach((s: any) => this.siteMap[s.siteID]         = s.name);
      (siteProtocols.items ?? []).forEach((sp: any) => this.siteProtocolMap[sp.siteProtocolID] = sp);

      this.enrollments  = enrollments.items  ?? [];
      this.adverseEvents= adverseEvents.items ?? [];

      // Filter visits to this patient's enrollments — future Scheduled only, sorted asc
      const todayStr = new Date().toISOString().substring(0, 10);
      const myEnrollmentIDs = new Set<number>(this.enrollments.map((e: any) => e.enrollmentID));
      this.upcomingVisits = (allVisits.items ?? [])
        .filter((v: any) =>
          myEnrollmentIDs.has(v.enrollmentID) &&
          v.status === 'Scheduled' &&
          v.visitDate?.substring(0, 10) >= todayStr
        )
        .sort((a: any, b: any) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime())
        .slice(0, 6);

      // Stats
      this.statsEnrollments       = this.enrollments.length;
      this.statsActiveEnrollments = this.enrollments.filter((e: any) => e.status === 'Active').length;
      this.statsUpcomingVisits    = this.upcomingVisits.length;

      this.detailsLoading = false;

      // Fetch investigator user record for the active (or first) enrollment
      const activeEnrollment = this.enrollments.find((e: any) => e.status === 'Active') ?? this.enrollments[0];
      if (activeEnrollment) {
        const sp    = this.siteProtocolMap[activeEnrollment.siteProtocolID];
        const invID = sp?.investigatorID ?? sp?.investigatorId ?? sp?.InvestigatorID;
        if (invID) {
          this.http.get<any>(`${environment.apiUrl}/users/${invID}`)
            .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
            .subscribe(user => {
              this.investigatorInfo    = user;
              this.investigatorLoading = false;
              if (!user) this.investigatorNotAssigned = true;
            });
        } else {
          this.investigatorLoading     = false;
          this.investigatorNotAssigned = true;
        }
      } else {
        this.investigatorLoading     = false;
        this.investigatorNotAssigned = true;
      }
    });
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  get firstName() { return this.user?.name?.split(' ')[0] ?? this.user?.name; }

  /** Two-letter initials for the avatar circle. */
  get initials(): string {
    const name = this.user?.name ?? '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    const a = parts[0].charAt(0);
    const b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (a + b).toUpperCase();
  }

  /** Active enrollment's protocol title, or a fallback. */
  get activeStudyName(): string {
    const active = this.enrollments.find((e: any) => e.status === 'Active') ?? this.enrollments[0];
    if (!active) return 'Clinical trial participant';
    return this.protocolName(active.siteProtocolID);
  }

  /** The soonest upcoming scheduled visit. */
  get nextVisit(): any {
    return this.upcomingVisits[0] ?? null;
  }

  /** Two-letter avatar for a message sender, derived from category text. */
  messageAvatar(n: any): string {
    const src = n?.category ?? n?.from ?? 'SY';
    const parts = String(src).trim().split(/\s+/);
    const a = parts[0]?.charAt(0) ?? '?';
    const b = parts[1]?.charAt(0) ?? '';
    return (a + b).toUpperCase();
  }

  get formattedDOB(): string {
    if (!this.patientRecord?.dob) return '—';
    return new Date(this.patientRecord.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  // ── Lookup helpers ────────────────────────────────────────────────────────
  protocolName(siteProtocolID: number): string {
    const sp = this.siteProtocolMap[siteProtocolID];
    if (!sp) return `SP #${siteProtocolID}`;
    return this.protocolMap[sp.protocolID] ?? `Protocol #${sp.protocolID}`;
  }

  siteName(siteProtocolID: number): string {
    const sp = this.siteProtocolMap[siteProtocolID];
    if (!sp) return '—';
    return this.siteMap[sp.siteID] ?? `Site #${sp.siteID}`;
  }

  visitProtocolName(enrollmentID: number): string {
    const e = this.enrollments.find((e: any) => e.enrollmentID === enrollmentID);
    return e ? this.protocolName(e.siteProtocolID) : `Enrollment #${enrollmentID}`;
  }

  visitSiteName(enrollmentID: number): string {
    const e = this.enrollments.find((e: any) => e.enrollmentID === enrollmentID);
    return e ? this.siteName(e.siteProtocolID) : '—';
  }

  // ── Badge helpers ─────────────────────────────────────────────────────────
  enrollmentStatusClass(s: string): string {
    const m: Record<string, string> = {
      Active: 'badge-green', Completed: 'badge-blue',
      Screening: 'badge-cyan', Withdrawn: 'badge-red'
    };
    return m[s] ?? 'badge-slate';
  }

  visitStatusClass(s: string): string {
    const m: Record<string, string> = {
      Scheduled: 'badge-blue', Completed: 'badge-green',
      Missed: 'badge-amber',   Cancelled: 'badge-red'
    };
    return m[s] ?? 'badge-slate';
  }

  aeSeverityClass(s: string): string {
    const m: Record<string, string> = {
      Mild: 'badge-amber', Moderate: 'badge-amber',
      Severe: 'badge-red', 'Life-Threatening': 'badge-red'
    };
    return m[s] ?? 'badge-slate';
  }

  aeStatusClass(s: string): string {
    const m: Record<string, string> = {
      Reported: 'badge-amber', 'Under Review': 'badge-blue',
      Resolved: 'badge-green', Closed: 'badge-slate'
    };
    return m[s] ?? 'badge-slate';
  }

  // ── Symptom Report modal helpers ──────────────────────────────────────────
  openSymptomModal(): void {
    this.symptomForm       = { enrollmentID: '', description: '' };
    this.symptomFormErrors = {};
    this.symptomError      = '';
    this.symptomSuccess    = '';
    this.showSymptomModal  = true;
  }

  closeSymptomModal(): void {
    this.showSymptomModal = false;
  }

  /** Label shown per enrollment option: "Protocol @ Site" */
  enrollmentLabel(e: any): string {
    return `${this.protocolName(e.siteProtocolID)} @ ${this.siteName(e.siteProtocolID)}`;
  }

  private validateSymptomForm(): boolean {
    this.symptomFormErrors = {};
    if (!this.symptomForm.enrollmentID)
      this.symptomFormErrors['enrollmentID'] = 'Please select a trial.';
    if (!this.symptomForm.description.trim())
      this.symptomFormErrors['description'] = 'Please describe your symptom.';
    else if (this.symptomForm.description.trim().length < 5)
      this.symptomFormErrors['description'] = 'Description must be at least 5 characters.';
    else if (this.symptomForm.description.trim().length > 1000)
      this.symptomFormErrors['description'] = 'Description cannot exceed 1000 characters.';
    return Object.keys(this.symptomFormErrors).length === 0;
  }

  submitSymptom(): void {
    if (!this.validateSymptomForm()) return;

    const enrollment = this.enrollments.find(
      (e: any) => e.enrollmentID === +this.symptomForm.enrollmentID
    );
    if (!enrollment) { this.symptomError = 'Selected trial not found.'; return; }

    const sp = this.siteProtocolMap[enrollment.siteProtocolID];
    const investigatorID = sp?.investigatorID ?? sp?.investigatorId;
    if (!investigatorID) {
      this.symptomError = 'No investigator is assigned to this trial yet. Please contact your coordinator.';
      return;
    }

    this.symptomSubmitting = true;
    this.symptomError      = '';
    this.symptomSuccess    = '';

    const trialLabel = this.enrollmentLabel(enrollment);
    const payload = {
      userID:   investigatorID,
      message:  `Symptom reported by ${this.user?.name ?? 'Patient'} (${trialLabel}): ${this.symptomForm.description.trim()}`,
      category: 'Symptom'
    };

    this.http.post(`${environment.apiUrl}/notifications`, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.symptomSuccess    = 'Your report has been sent to your investigator.';
          this.symptomSubmitting = false;
          setTimeout(() => this.closeSymptomModal(), 2000);
        },
        error: () => {
          this.symptomError      = 'Failed to send report. Please try again.';
          this.symptomSubmitting = false;
        }
      });
  }

  // ── Investigator display helpers ──────────────────────────────────────
  get investigatorInitial(): string {
    const name = this.investigatorInfo?.name ?? this.investigatorInfo?.Name ?? '';
    return name.charAt(0).toUpperCase() || '?';
  }

  get investigatorName(): string {
    return this.investigatorInfo?.name ?? this.investigatorInfo?.Name ?? '';
  }

  get investigatorEmail(): string {
    return this.investigatorInfo?.email ?? this.investigatorInfo?.Email ?? '';
  }

  get investigatorPhone(): string {
    return this.investigatorInfo?.phone ?? this.investigatorInfo?.Phone ?? '';
  }

  // ── Mark notification as read ─────────────────────────────────────────
  markNotificationRead(n: any): void {
    this.http.post(`${environment.apiUrl}/notifications/${n.notificationID}/read`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          n.status = 'Read';
          this.statsNotifications = this.notifications.filter((x: any) => x.status === 'Unread').length;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
