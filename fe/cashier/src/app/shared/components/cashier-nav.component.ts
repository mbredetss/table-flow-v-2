import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { AudioService } from '../../core/services/audio.service';

@Component({
  selector: 'app-cashier-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="sticky top-0 z-40 bg-canvas border-b border-hairline h-20 transition-all shadow-sm">
      <div class="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <!-- Brand Logo & Station Badge -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-rausch text-white flex items-center justify-center font-bold text-base shadow-sm">
            👨‍🍳
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-display-sm font-bold text-ink tracking-tight block leading-none">TableFlow</span>
              <span class="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Cashier Station
              </span>
            </div>
            <span class="text-[11px] text-muted font-medium block mt-1 tracking-wider">
              Kitchen Fulfillment & Order Expediting (Port 4201)
            </span>
          </div>
        </div>

        <!-- Center SSE Live Stream Badge -->
        <div class="hidden md:flex items-center gap-3 bg-surface-soft px-3.5 py-1.5 rounded-full border border-hairline text-xs font-medium text-ink">
          <span
            class="w-2.5 h-2.5 rounded-full"
            [ngClass]="dashboardService.isConnected() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'"
          ></span>
          <span>{{ dashboardService.isConnected() ? 'Live Stream Active (/sse/dashboard)' : 'Connecting to Kitchen Stream...' }}</span>
          <span class="text-hairline">|</span>
          <button
            type="button"
            (click)="testChime()"
            class="text-rausch hover:underline font-semibold flex items-center gap-1"
            title="Uji suara lonceng pesanan baru"
          >
            🔔 Test Sound
          </button>
        </div>

        <!-- Right User Actions -->
        <div class="flex items-center gap-3">
          @if (authService.currentUser(); as user) {
            <div class="flex items-center gap-2.5 pl-3 border-l border-hairline">
              <div class="w-8 h-8 rounded-full bg-surface-strong border border-hairline flex items-center justify-center font-bold text-xs text-ink">
                {{ user.name.charAt(0).toUpperCase() }}
              </div>
              <div class="hidden sm:block text-left text-xs">
                <span class="font-semibold text-ink block leading-tight">{{ user.name }}</span>
                <span class="text-[10px] text-muted uppercase font-bold text-rausch">{{ user.role }}</span>
              </div>
              <button
                type="button"
                (click)="logout()"
                class="ml-2 px-3 py-1.5 text-xs font-semibold rounded-sm border border-hairline hover:border-rausch hover:text-rausch transition"
              >
                Sign Out
              </button>
            </div>
          } @else {
            <a
              routerLink="/login"
              class="px-4 py-2 rounded-sm bg-rausch hover:bg-rausch-active text-white text-xs font-semibold shadow-sm transition"
            >
              Cashier Sign In
            </a>
          }
        </div>
      </div>
    </header>
  `
})
export class CashierNavComponent {
  readonly authService = inject(AuthService);
  readonly dashboardService = inject(DashboardService);
  private audioService = inject(AudioService);

  @Output() openLoginModal = new EventEmitter<void>();

  testChime(): void {
    this.audioService.playChime();
  }

  logout(): void {
    this.authService.logout();
  }
}
