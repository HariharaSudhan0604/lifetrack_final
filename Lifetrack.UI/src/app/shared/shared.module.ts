import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PageHeaderComponent } from './components/page-header/page-header.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';

/**
 * SharedModule — import this into any feature module that needs
 * reusable presentational components.
 *
 * Components exported:
 *   <app-page-header>   — back button + title + subtitle + optional action slot
 *   <app-empty-state>   — centred empty state with optional icon, title, message
 */
@NgModule({
  declarations: [
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  imports: [CommonModule],
  exports: [
    CommonModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ]
})
export class SharedModule {}
