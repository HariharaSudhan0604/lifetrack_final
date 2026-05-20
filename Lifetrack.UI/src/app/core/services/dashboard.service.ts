import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PagedResult<T> {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: T[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  count(resource: string, params: Record<string, string> = {}): Observable<number> {
    const qs = new URLSearchParams({ page: '1', pageSize: '1', ...params });
    return this.http.get<PagedResult<unknown>>(`${this.api}/${resource}?${qs}`)
      .pipe(
        map(r => r?.totalCount ?? 0),
        catchError(err => {
          console.error(`[Dashboard] count(${resource}) failed`, err);
          return of(0);
        })
      );
  }

  list<T>(resource: string, params: Record<string, string> = {}): Observable<T[]> {
    const qs = new URLSearchParams({ page: '1', pageSize: '6', ...params });
    return this.http.get<PagedResult<T>>(`${this.api}/${resource}?${qs}`)
      .pipe(
        map(r => r?.items ?? []),
        catchError(err => {
          console.error(`[Dashboard] list(${resource}) failed`, err);
          return of([]);
        })
      );
  }
}
