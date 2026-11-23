import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center p-4">
      <div class="bg-canvas w-full max-w-md rounded-md border border-hairline p-8 shadow-airbnb-modal animate-in fade-in">
        <!-- Logo & Title Header -->
        <div class="text-center mb-6">
          <div class="w-12 h-12 rounded-full bg-rausch text-white flex items-center justify-center font-bold text-lg mx-auto mb-3 shadow-sm">
            TF
          </div>
          <h2 class="font-display-md text-ink">Selamat Datang di TableFlow</h2>
          <p class="font-body-sm text-muted mt-1">
            Silakan login terlebih dahulu untuk mulai memesan makanan dari meja Anda
          </p>
        </div>

        <!-- Mode Tabs: Login vs Register -->
        <div class="flex border-b border-hairline mb-6">
          <button
            type="button"
            (click)="setMode('login')"
            class="flex-1 pb-3 text-center font-title-sm font-semibold transition border-b-2"
            [ngClass]="mode() === 'login' ? 'border-rausch text-rausch' : 'border-transparent text-muted hover:text-ink'"
          >
            Masuk
          </button>
          <button
            type="button"
            (click)="setMode('register')"
            class="flex-1 pb-3 text-center font-title-sm font-semibold transition border-b-2"
            [ngClass]="mode() === 'register' ? 'border-rausch text-rausch' : 'border-transparent text-muted hover:text-ink'"
          >
            Daftar Akun Baru
          </button>
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
          @if (mode() === 'register') {
            <div>
              <label class="block font-caption text-ink mb-1">Nama Lengkap</label>
              <input
                type="text"
                [(ngModel)]="name"
                name="name"
                required
                placeholder="cth. Rina Wulandari"
                class="w-full h-11 px-3.5 rounded-sm border border-hairline focus:border-ink outline-none text-xs transition"
              />
            </div>
          }

          <div>
            <label class="block font-caption text-ink mb-1">Alamat Email</label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              placeholder="nama@email.com"
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
              placeholder="Minimal 6 karakter"
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
              <span>Memproses...</span>
            } @else {
              <span>{{ mode() === 'login' ? 'Masuk ke TableFlow' : 'Daftar Sekarang' }}</span>
            }
          </button>
        </form>

        <div class="mt-6 pt-5 border-t border-hairline text-center text-xs text-muted">
          <span>Akses Meja Aman • TableFlow Customer Portal</span>
        </div>
      </div>
    </div>
  `
})
export class LoginPageComponent {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  mode = signal<'login' | 'register'>('login');
  email = '';
  password = '';
  name = '';
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  setMode(m: 'login' | 'register'): void {
    this.mode.set(m);
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (!this.email || !this.password) {
      this.errorMessage.set('Email dan kata sandi wajib diisi.');
      return;
    }

    if (this.mode() === 'register' && !this.name) {
      this.errorMessage.set('Nama lengkap wajib diisi untuk pendaftaran.');
      return;
    }

    this.loading.set(true);
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';

    if (this.mode() === 'login') {
      this.authService.login({ email: this.email, password: this.password }).subscribe({
        next: (res) => {
          this.loading.set(false);
          this.notificationService.show({
            type: 'success',
            title: 'Berhasil Masuk',
            message: `Selamat datang kembali, ${res.user.name}!`,
            duration: 3000
          });
          this.router.navigateByUrl(returnUrl);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.message || 'Email atau kata sandi tidak sesuai.');
        }
      });
    } else {
      this.authService.register({ email: this.email, password: this.password, name: this.name, confirmPassword: this.password }).subscribe({
        next: (res) => {
          this.loading.set(false);
          this.notificationService.show({
            type: 'success',
            title: 'Akun Dibuat',
            message: `Akun berhasil didaftarkan. Selamat datang, ${res.user.name}!`,
            duration: 3000
          });
          this.router.navigateByUrl(returnUrl);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.message || 'Pendaftaran akun gagal. Silakan coba kembali.');
        }
      });
    }
  }
}
