import { Component, Input } from '@angular/core';

/**
 * Reusable empty-state block for tables and lists.
 *
 * Simple usage (message only):
 *   <app-empty-state message="No documents found."></app-empty-state>
 *
 * With title + custom icon slot:
 *   <app-empty-state title="No Reports" message="No KPI reports match the selected filter.">
 *     <svg empty-icon ...></svg>
 *   </app-empty-state>
 */
@Component({
  selector: 'app-empty-state',
  standalone: false,
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.css']
})
export class EmptyStateComponent {
  @Input() title?: string;
  @Input() message = 'No data found.';
}
