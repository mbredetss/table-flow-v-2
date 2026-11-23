import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AdminNavComponent } from './shared/components/admin-nav.component';
import { NotificationBannerComponent } from './shared/components/notification-banner.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    AdminNavComponent,
    NotificationBannerComponent
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-surface-soft text-ink font-sans">
      <!-- Global Top Floating Notification Banner -->
      <app-notification-banner></app-notification-banner>

      <!-- Admin Top Navigation Bar -->
      <app-admin-nav></app-admin-nav>

      <!-- Main Admin Panel Content -->
      <main class="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <router-outlet></router-outlet>
      </main>

      <!-- Admin Station Footer -->
      <footer class="bg-canvas border-t border-hairline py-4 text-center text-xs text-muted mt-auto">
        <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TableFlow Restaurant Administration & QR Management</span>
          <span class="font-mono text-[11px] bg-surface-strong px-2 py-0.5 rounded border border-hairline">Port 4202</span>
        </div>
      </footer>
    </div>
  `
})
export class AppComponent {
  readonly authService = inject(AuthService);
}
