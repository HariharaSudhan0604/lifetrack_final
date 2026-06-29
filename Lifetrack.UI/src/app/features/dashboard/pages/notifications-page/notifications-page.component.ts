import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { catchError, of, takeUntil } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { NavigationService } from '../../../../core/services/navigation.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-notifications-page',
  standalone: false,
  templateUrl: './notifications-page.component.html',
  styleUrls: ['./notifications-page.component.css']
})
export class NotificationsPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading       = true;
  notifications: any[] = [];

  searchTerm   = '';
  filterStatus = '';
  filterCat    = '';
  categories:  string[] = [];

  readonly statuses = ['Unread', 'Read'];

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private nav: NavigationService
  ) {}

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/notifications/my?pageSize=200`)
      .pipe(catchError(() => of({ items: [] })), takeUntil(this.destroy$))
      .subscribe(res => {
        this.notifications = (res.items ?? [])
          .sort((a: any, b: any) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
        this.categories = [...new Set<string>(this.notifications.map((n: any) => n.category).filter(Boolean))];
        this.loading = false;
      });
  }

  get filtered(): any[] {
    let list = this.notifications;
    if (this.filterStatus) list = list.filter(n => n.status === this.filterStatus);
    if (this.filterCat)    list = list.filter(n => n.category === this.filterCat);
    const term = this.searchTerm.trim().toLowerCase();
    if (term) list = list.filter(n => (n.message ?? '').toLowerCase().includes(term));
    return list;
  }

  get unreadCount(): number {
    return this.notifications.filter(n => n.status === 'Unread').length;
  }

  markRead(n: any): void {
    if (n.status === 'Read') return;
    this.http.post(`${environment.apiUrl}/notifications/${n.notificationID}/read`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => { n.status = 'Read'; } });
  }

  markAllRead(): void {
    const unread = this.notifications.filter(n => n.status === 'Unread');
    unread.forEach(n => this.markRead(n));
  }

  deleteNotif(n: any): void {
    this.http.delete(`${environment.apiUrl}/notifications/${n.notificationID}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => {
        this.notifications = this.notifications.filter(x => x.notificationID !== n.notificationID);
      }});
  }

  goBack(): void { this.nav.back('/dashboard'); }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
