import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="sticky top-0 z-40 bg-canvas border-b border-hairline h-20 transition-all">
      <div class="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <!-- Brand Logo -->
        <a routerLink="/" class="flex items-center gap-2.5 text-rausch hover:opacity-90 transition group">
          <div class="w-9 h-9 rounded-full bg-rausch text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
            TF
          </div>
          <div>
            <span class="font-display-sm font-bold text-rausch tracking-tight block leading-none">TableFlow</span>
            <span class="text-[10px] text-muted font-medium block mt-0.5 tracking-wider uppercase">Order & Pay At Seat</span>
          </div>
        </a>

        <!-- Center Product Navigation Tabs (Airbnb style) -->
        <nav class="hidden md:flex items-center gap-6">
          <a
            routerLink="/"
            routerLinkActive="text-ink border-b-2 border-ink"
            [routerLinkActiveOptions]="{ exact: true }"
            class="h-20 flex items-center font-title-md font-semibold text-muted hover:text-ink transition border-b-2 border-transparent px-1"
          >
            🍽️ Menu
          </a>

          <a
            routerLink="/tracking"
            routerLinkActive="text-ink border-b-2 border-ink"
            class="h-20 flex items-center gap-1.5 font-title-md font-semibold text-muted hover:text-ink transition border-b-2 border-transparent px-1 relative"
          >
            <span>⏱️ Live Tracking</span>
            <span class="bg-rausch text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              LIVE
            </span>
          </a>

          <a
            routerLink="/history"
            routerLinkActive="text-ink border-b-2 border-ink"
            class="h-20 flex items-center font-title-md font-semibold text-muted hover:text-ink transition border-b-2 border-transparent px-1"
          >
            📋 My Orders
          </a>

          <a
            routerLink="/cashier"
            routerLinkActive="text-ink border-b-2 border-ink"
            class="h-20 flex items-center gap-1.5 font-title-md font-semibold text-muted hover:text-ink transition border-b-2 border-transparent px-1"
          >
            <span>👨‍🍳 Cashier Board</span>
            <span class="bg-ink/10 text-ink text-[10px] font-bold px-2 py-0.5 rounded-full">
              Staff
            </span>
          </a>

          <a
            routerLink="/admin"
            routerLinkActive="text-ink border-b-2 border-ink"
            class="h-20 flex items-center gap-1.5 font-title-md font-semibold text-muted hover:text-ink transition border-b-2 border-transparent px-1"
          >
            <span>⚙️ Admin</span>
          </a>
        </nav>

        <!-- Right Utilities: Table Indicator, Cart Pill, User Pill -->
        <div class="flex items-center gap-3">
          <!-- Table Number Selector Pill -->
          <button
            type="button"
            (click)="openQrModal.emit()"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-hairline hover:border-ink bg-surface-soft text-ink text-xs font-semibold transition"
          >
            <span class="text-base">🪑</span>
            <span>{{ cartService.tableNumber() ? 'Table ' + cartService.tableNumber() : 'Scan Table' }}</span>
          </button>

          <!-- Cart Trigger Pill (Mobile & Desktop) -->
          <button
            type="button"
            (click)="toggleCart.emit()"
            class="relative flex items-center justify-center w-10 h-10 rounded-full border border-hairline hover:border-ink bg-canvas text-ink transition shadow-sm"
            aria-label="View Cart"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            @if (cartService.itemCount() > 0) {
              <span class="absolute -top-1 -right-1 bg-rausch text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                {{ cartService.itemCount() }}
              </span>
            }
          </button>

          <!-- User Account Pill -->
          @if (authService.isLoggedIn()) {
            <div class="relative group">
              <button
                type="button"
                class="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border border-hairline hover:shadow-airbnb bg-canvas transition"
              >
                <span class="text-xs font-semibold text-ink max-w-[90px] truncate">
                  {{ authService.currentUser()?.name }}
                </span>
                <div class="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold">
                  {{ authService.currentUser()?.name?.charAt(0)?.toUpperCase() }}
                </div>
              </button>

              <!-- Dropdown Menu -->
              <div class="absolute right-0 mt-2 w-48 rounded-md bg-canvas shadow-airbnb border border-hairline p-1 hidden group-hover:block animate-in fade-in z-50">
                <div class="px-3 py-2 border-b border-hairline">
                  <p class="text-xs font-semibold text-ink">{{ authService.currentUser()?.name }}</p>
                  <p class="text-[11px] text-muted truncate">{{ authService.currentUser()?.email }}</p>
                  <span class="inline-block mt-1 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-surface-strong text-ink">
                    {{ authService.currentUser()?.role }}
                  </span>
                </div>
                <a routerLink="/history" class="block px-3 py-2 text-xs text-ink hover:bg-surface-soft rounded-sm">Order History</a>
                <a routerLink="/cashier" class="block px-3 py-2 text-xs text-ink hover:bg-surface-soft rounded-sm">Cashier Dashboard</a>
                <a routerLink="/admin" class="block px-3 py-2 text-xs text-ink hover:bg-surface-soft rounded-sm">Admin Panel</a>
                <button
                  type="button"
                  (click)="authService.logout()"
                  class="w-full text-left px-3 py-2 text-xs text-rausch hover:bg-rausch/10 rounded-sm font-semibold border-t border-hairline mt-1"
                >
                  Log out
                </button>
              </div>
            </div>
          } @else {
            <button
              type="button"
              (click)="openLoginModal.emit()"
              class="px-4 py-2 rounded-full bg-rausch hover:bg-rausch-active text-white text-xs font-semibold transition shadow-sm"
            >
              Log In
            </button>
          }
        </div>
      </div>
    </header>
  `
})
export class TopNavComponent {
  @Output() openLoginModal = new EventEmitter<void>();
  @Output() openQrModal = new EventEmitter<void>();
  @Output() toggleCart = new EventEmitter<void>();

  readonly authService = inject(AuthService);
  readonly cartService = inject(CartService);
}
