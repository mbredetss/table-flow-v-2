import { Routes } from '@angular/router';
import { AdminPanelComponent } from './features/admin-panel/admin-panel.component';
import { AdminLoginPageComponent } from './features/auth/admin-login-page.component';
import { adminAuthGuard, adminGuestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: AdminLoginPageComponent,
    canActivate: [adminGuestGuard],
    title: 'TableFlow — Masuk Admin Management'
  },
  {
    path: '',
    component: AdminPanelComponent,
    canActivate: [adminAuthGuard],
    title: 'TableFlow — Restaurant Management'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
