import { Component, Input, Output, EventEmitter } from '@angular/core';

/**
 * Reusable page header used by every sub-page.
 *
 * Usage:
 *   <app-page-header title="Documents" subtitle="Review compliance files" (back)="goBack()">
 *     <!-- optional right-side action buttons go here as ng-content -->
 *     <button class="btn-new" (click)="openModal()">+ New</button>
 *   </app-page-header>
 */
@Component({
  selector: 'app-page-header',
  standalone: false,
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.css']
})
export class PageHeaderComponent {
  @Input() title!: string;
  @Input() subtitle?: string;
  @Output() back = new EventEmitter<void>();

  onBack(): void { this.back.emit(); }
}
