import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, Subject } from 'rxjs';
import { catchError, of, takeUntil } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { UserInfo } from '../../../../core/models/auth.models';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-investigator-dashboard',
  standalone: false,
  templateUrl: './investigator-dashboard.component.html',
  styleUrls: ['./investigator-dashboard.component.css']
})
export class InvestigatorDashboardComponent implements OnInit, OnDestroy {
  user: UserInfo | null;
  /** Signal that completes all subscriptions on component destroy. */
  private destroy$ = new Subject<void>();

  today = new Date();

  // ── Stats ──────────────────────────────────────────────────────────────────
  patients = 0; adverseEvents = 0; visits = 0;
  loading = true;

  // ── My Assignments ─────────────────────────────────────────────────────────
  myAssignments: any[] = [];
  protocolMap: Record<number, string> = {};
  siteMap: Record<number, string>     = {};
  assignmentsLoading = true;

  // ── Upcoming Visits ────────────────────────────────────────────────────────
  todayVisits: any[] = [];   // kept for backwards-compat; now holds upcoming visits
  private enrollmentMap: Record<number, { patientID: number; siteProtocolID: number }> = {};
  private patientMap:    Record<number, any> = {};
  remindingVisitID: number | null = null;

  // ── 12-hour reminder cooldown (persisted in localStorage) ─────────────────
  private remindKey(visitID: number): string { return `lt_remind_${visitID}`; }

  isReminderDisabled(visitID: number): boolean {
    const stored = localStorage.getItem(this.remindKey(visitID));
    if (!stored) return false;
    return Date.now() - +stored < 12 * 60 * 60 * 1000;   // 12 h in ms
  }

  reminderBtnLabel(visitID: number): string {
    if (this.remindingVisitID === visitID) return 'Sending…';
    return this.isReminderDisabled(visitID) ? '✓ Sent' : 'Remind';
  }
  private spToProtocolMap: Record<number, number> = {};

  // ── Recent Adverse Events ──────────────────────────────────────────────────
  recentAEs:   any[] = [];
  aesLoading = true;

  // ── Notifications ──────────────────────────────────────────────────────────
  notifications:  any[] = [];
  notifLoading  = true;
  showNotifPanel = false;
  get unreadCount(): number { return this.notifications.filter(n => n.status === 'Unread').length; }

  constructor(
    private auth: AuthService,
    private ds: DashboardService,
    private http: HttpClient,
    private router: Router
  ) {
    this.user = this.auth.currentUser;
  }

  ngOnInit() {
    // General stats + recent AEs
    forkJoin({
      patients:      this.ds.count('patients'),
      adverseEvents: this.ds.count('adverse-events', { status: 'Reported' }),
      visits:        this.ds.count('visits'),
      recentAEs:     this.ds.list<any>('adverse-events'),
    }).pipe(takeUntil(this.destroy$)).subscribe(d => {
      this.patients = d.patients;
      this.adverseEvents = d.adverseEvents; this.visits = d.visits;
      this.recentAEs = d.recentAEs;
      this.loading   = false;
      this.aesLoading = false;
    });

    // Notifications for this investigator
    this.http.get<any>(`${environment.apiUrl}/notifications/my?pageSize=20`)
      .pipe(catchError(() => of({ items: [] })), takeUntil(this.destroy$))
      .subscribe(res => {
        this.notifications = res.items ?? [];
        this.notifLoading  = false;
      });

    // My protocol + site assignments, enrolled patients & today's visits
    const uid = this.user?.userID;
    if (uid) {
      forkJoin({
        assignments: this.http.get<any>(`${environment.apiUrl}/site-protocols?investigatorId=${uid}&pageSize=50`)
          .pipe(catchError(() => of({ items: [] }))),
        protocols:   this.http.get<any>(`${environment.apiUrl}/protocols?pageSize=200`)
          .pipe(catchError(() => of({ items: [] }))),
        sites:       this.http.get<any>(`${environment.apiUrl}/sites?pageSize=200`)
          .pipe(catchError(() => of({ items: [] }))),
        enrollments: this.http.get<any>(`${environment.apiUrl}/enrollments?pageSize=200`)
          .pipe(catchError(() => of({ items: [] }))),
        patients:    this.http.get<any>(`${environment.apiUrl}/patients?pageSize=200`)
          .pipe(catchError(() => of({ items: [] }))),
        allVisits:   this.http.get<any>(`${environment.apiUrl}/visits?pageSize=200`)
          .pipe(catchError(() => of({ items: [] }))),
      }).pipe(takeUntil(this.destroy$))
        .subscribe(({ assignments, protocols, sites, enrollments, patients, allVisits }) => {
          // Protocol + site maps
          this.myAssignments = assignments.items ?? [];
          const pm: Record<number, string> = {};
          (protocols.items ?? []).forEach((p: any) => pm[p.protocolID] = p.title);
          this.protocolMap = pm;
          const sm: Record<number, string> = {};
          (sites.items ?? []).forEach((s: any) => sm[s.siteID] = s.name);
          this.siteMap = sm;

          // siteProtocolID → protocolID (for visit-card protocol label)
          const spMap: Record<number, number> = {};
          this.myAssignments.forEach((a: any) => spMap[a.siteProtocolID] = a.protocolID);
          this.spToProtocolMap = spMap;

          // Enrollments that belong to this investigator's assignments
          const mySpIds = new Set(this.myAssignments.map((a: any) => a.siteProtocolID));
          const myEnrollments = (enrollments.items ?? []).filter((e: any) => mySpIds.has(e.siteProtocolID));
          const myEnrollmentIds = new Set(myEnrollments.map((e: any) => e.enrollmentID));

          const em: Record<number, { patientID: number; siteProtocolID: number }> = {};
          myEnrollments.forEach((e: any) => em[e.enrollmentID] = { patientID: e.patientID, siteProtocolID: e.siteProtocolID });
          this.enrollmentMap = em;

          const ptMap: Record<number, any> = {};
          (patients.items ?? []).forEach((p: any) => ptMap[p.patientID] = p);   // full object
          this.patientMap = ptMap;

          // Upcoming scheduled visits for this investigator (today and future, sorted asc)
          const todayStr = new Date().toISOString().substring(0, 10);
          this.todayVisits = (allVisits.items ?? [])
            .filter((v: any) =>
              myEnrollmentIds.has(v.enrollmentID) &&
              v.status === 'Scheduled' &&
              v.visitDate?.substring(0, 10) >= todayStr
            )
            .sort((a: any, b: any) =>
              new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()
            )
            .slice(0, 8);

          this.assignmentsLoading = false;
        });
    } else {
      this.assignmentsLoading = false;
    }
  }

  get firstName() { return this.user?.name?.split(' ')[0] ?? this.user?.name; }

  /** Number of distinct sites this investigator is assigned to. */
  get mySitesCount(): number {
    return new Set(this.myAssignments.map(a => a.siteID)).size;
  }

  markAsRead(n: any): void {
    if (n.status === 'Read') return;
    this.http.post(`${environment.apiUrl}/notifications/${n.notificationID}/read`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => { n.status = 'Read'; } });
  }

  sendReminder(v: any): void {
    if (this.remindingVisitID === v.visitID) return;
    const enr = this.enrollmentMap[v.enrollmentID];
    if (!enr) return;
    const patientUserID = this.patientMap[enr.patientID]?.userID;
    if (!patientUserID) return;

    this.remindingVisitID = v.visitID;
    const dLabel    = new Date(v.visitDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const proto     = this.visitProtocolName(v);

    this.http.post(`${environment.apiUrl}/notifications`, {
      userID:   patientUserID,
      message:  `Reminder from your investigator: You have a visit scheduled on ${dLabel} for ${proto}. Please ensure you attend on time.`,
      category: 'Visit Reminder'
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        localStorage.setItem(this.remindKey(v.visitID), String(Date.now()));
        this.remindingVisitID = null;
      },
      error: () => { this.remindingVisitID = null; }
    });
  }

  manageEnrollments()   { this.router.navigate(['/dashboard/enrollments']); }
  manageVisits()        { this.router.navigate(['/dashboard/visits']); }
  manageAdverseEvents() { this.router.navigate(['/dashboard/adverse-events']); }
  manageDeviations()    { this.router.navigate(['/dashboard/deviations']); }
  manageAssignments()   { this.router.navigate(['/dashboard/my-assignments']); }

  protocolName(id: number)  { return this.protocolMap[id] ?? `Protocol #${id}`; }
  siteName(id: number)      { return this.siteMap[id]     ?? `Site #${id}`; }
  aePatientName(ae: any)    { return this.patientMap[ae.patientID]?.name ?? `Patient #${ae.patientID}`; }

  assignmentStatusClass(s: string): string {
    const m: Record<string, string> = {
      Active: 'badge-green', Pending: 'badge-amber',
      Suspended: 'badge-red', Completed: 'badge-blue'
    };
    return m[s] ?? 'badge-slate';
  }

  aeSeverityClass(s: string): string {
    const m: Record<string, string> = {
      'Life-Threatening': 'badge-red', Severe: 'badge-red',
      Moderate: 'badge-amber', Mild: 'badge-green'
    };
    return m[s] ?? 'badge-slate';
  }

  aeStatusClass(s: string): string {
    const m: Record<string, string> = {
      Reported: 'badge-red', 'Under Review': 'badge-amber',
      Resolved: 'badge-green', Closed: 'badge-slate'
    };
    return m[s] ?? 'badge-slate';
  }

  // ── Today's Visits helpers ─────────────────────────────────────────────────
  visitPatientName(v: any): string {
    const enr = this.enrollmentMap[v.enrollmentID];
    if (!enr) return `Patient #?`;
    return this.patientMap[enr.patientID]?.name ?? `Patient #${enr.patientID}`;
  }

  visitProtocolName(v: any): string {
    const enr = this.enrollmentMap[v.enrollmentID];
    if (!enr) return '—';
    const protocolId = this.spToProtocolMap[enr.siteProtocolID];
    return protocolId ? this.protocolName(protocolId) : '—';
  }

  visitStatusClass(s: string): string {
    const m: Record<string, string> = {
      Completed: 'badge-green', Scheduled: 'badge-blue',
      Missed: 'badge-amber',   Cancelled: 'badge-red'
    };
    return m[s] ?? 'badge-slate';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
