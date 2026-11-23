import { Routes } from '@angular/router';
import { OrderDashboardComponent } from './features/order-dashboard/order-dashboard.component';
import { CashierLoginPageComponent } from './features/auth/cashier-login-page.component';
import { cashierAuthGuard, cashierGuestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: CashierLoginPageComponent,
    canActivate: [cashierGuestGuard],
    title: 'TableFlow — Masuk Kasir & Dapur'
  },
  {
    path: '',
    component: OrderDashboardComponent,
    canActivate: [cashierAuthGuard],
    title: 'TableFlow — Cashier Kitchen Board'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
