import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: 'auth',
    // loadChildren = LAZY LOADING
    // The AuthModule is NOT bundled into the initial JS download.
    // It's only fetched when the user first navigates to /auth/*
    // This makes the initial app load faster.

    loadChildren: () =>
      import('./features/auth/auth.module').then(m => m.AuthModule)
        // No guard here — login and register are public pages

  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.module').then(m => m.DashboardModule),
    // canActivate runs BEFORE the lazy module even loads.
    // If isLoggedIn() returns false, the DashboardModule bundle is never downloaded.
    canActivate: [AuthGuard] //checks whether user logged in
  },
    // If someone navigates to the root URL '/', redirect to /dashboard
  // pathMatch: 'full' means the entire URL must be '' (not just start with '')

  { path: '',      redirectTo: 'dashboard', pathMatch: 'full' },
    // Wildcard: catches any URL that doesn't match the routes above
  // e.g. /typo, /something-invalid → redirect to dashboard

  { path: '**',    redirectTo: 'dashboard' }
];

@NgModule({
    // forRoot() creates the singleton Router service and registers all routes
  // Only call forRoot() ONCE — in AppRoutingModule

  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
