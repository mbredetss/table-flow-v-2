import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-cashier-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center p-4">
      <div class="bg-canvas w-full max-w-md rounded-md border border-hairline p-8 shadow-airbnb-modal animate-in fade-in">
        <!-- Badge & Station Icon -->
        <div class="text-center mb-6">
          <div class="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-3 shadow-inner">
            👨‍🍳
          </div>
          <div class="inline-block bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
            Cashier Station • Port 4201
          </div>
          <h2 class="font-display-md text-ink">Cashier & Kitchen Login</h2>
          <p class="font-body-sm text-muted mt-1">
            Masuk dengan akun Kasir atau Staff untuk mengakses papan pesanan dapur
          </p>
        </div>

        <!-- Error Message Banner -->
        @if (errorMessage()) {
          <div class="mb-5 p-3.5 rounded-sm bg-rausch/10 border border-rausch/20 text-rausch text-xs flex items-center gap-2.5 animate-in fade-in">
            <span class="text-base shrink-0">⚠️</span>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <!-- Form -->
        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label class="block font-caption text-ink mb-1">Email Kasir / Staff</label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              placeholder="kasir@tableflow.com"
              class="w-full h-11 px-3.5 rounded-sm border border-hairline focus:border-ink outline-none text-xs transition"
            />
          </div>

          <div>
            <label class="block font-caption text-ink mb-1">Kata Sandi</label>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              placeholder="••••••••"
              class="w-full h-11 px-3.5 rounded-sm border border-hairline focus:border-ink outline-none text-xs transition"
            />
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full h-11 rounded-sm bg-rausch hover:bg-rausch-active text-white font-title-sm font-semibold transition disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 mt-6"
          >
            @if (loading()) {
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Memvalidasi Akses...</span>
            } @else {
              <span>Masuk ke Dashboard Dapur</span>
            }
          </button>
        </form>

        <div class="mt-6 pt-5 border-t border-hairline text-center text-xs text-muted">
          <span>Stasiun Dapur Terenkripsi • Khusus Karyawan</span>
        </div>
      </div>
    </div>
  `
})
export class CashierLoginPageComponent {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  onSubmit(): void {
    this.errorMessage.set(null);

    if (!this.email || !this.password) {
      this.errorMessage.set('Email dan kata sandi kasir wajib diisi.');
      return;
    }

    this.loading.set(true);
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.user.role !== 'cashier' && res.user.role !== 'admin') {
          this.authService.logout();
          this.errorMessage.set('Akses ditolak: Akun ini tidak memiliki hak akses sebagai Kasir atau Staff.');
          return;
        }

        this.notificationService.show({
          type: 'success',
          title: 'Kasir Terautentikasi',
          message: `Selamat bertugas, ${res.user.name}!`,
          duration: 3000
        });
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Email atau kata sandi tidak valid.');
      }
    });
  }
}
