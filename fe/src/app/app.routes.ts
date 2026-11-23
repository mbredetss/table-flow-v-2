import { Routes } from '@angular/router';
import { MenuBrowseComponent } from './features/customer/menu-browse/menu-browse.component';
import { PaymentScreenComponent } from './features/customer/payment/payment-screen.component';
import { OrderTrackingComponent } from './features/customer/order-tracking/order-tracking.component';
import { OrderHistoryComponent } from './features/customer/order-history/order-history.component';
import { OrderDashboardComponent } from './features/cashier/order-dashboard/order-dashboard.component';
import { AdminPanelComponent } from './features/admin/admin-panel/admin-panel.component';

export const routes: Routes = [
  {
    path: '',
    component: MenuBrowseComponent,
    title: 'TableFlow — Browse Menu & Order'
  },
  {
    path: 'payment',
    component: PaymentScreenComponent,
    title: 'TableFlow — QRIS Payment'
  },
  {
    path: 'tracking',
    component: OrderTrackingComponent,
    title: 'TableFlow — Live Order Tracking'
  },
  {
    path: 'history',
    component: OrderHistoryComponent,
    title: 'TableFlow — My Past Orders'
  },
  {
    path: 'cashier',
    component: OrderDashboardComponent,
    title: 'TableFlow — Cashier Kitchen Board'
  },
  {
    path: 'admin',
    component: AdminPanelComponent,
    title: 'TableFlow — Restaurant Management'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
