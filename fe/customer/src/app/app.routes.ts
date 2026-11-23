import { Routes } from '@angular/router';
import { MenuBrowseComponent } from './features/menu-browse/menu-browse.component';
import { PaymentScreenComponent } from './features/payment/payment-screen.component';
import { OrderTrackingComponent } from './features/order-tracking/order-tracking.component';
import { OrderHistoryComponent } from './features/order-history/order-history.component';
import { LoginPageComponent } from './features/auth/login-page.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginPageComponent,
    canActivate: [guestGuard],
    title: 'TableFlow — Masuk / Daftar Pelanggan'
  },
  {
    path: '',
    component: MenuBrowseComponent,
    canActivate: [authGuard],
    title: 'TableFlow — Browse Menu & Order'
  },
  {
    path: 'payment',
    component: PaymentScreenComponent,
    canActivate: [authGuard],
    title: 'TableFlow — QRIS Payment'
  },
  {
    path: 'tracking',
    component: OrderTrackingComponent,
    canActivate: [authGuard],
    title: 'TableFlow — Live Order Tracking'
  },
  {
    path: 'history',
    component: OrderHistoryComponent,
    canActivate: [authGuard],
    title: 'TableFlow — Order History'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
