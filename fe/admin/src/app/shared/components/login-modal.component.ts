import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-in fade-in">
      <div class="bg-canvas w-full max-w-md rounded-md p-6 shadow-airbnb-modal relative">
        <!-- Close Button -->
        <button
          type="button"
          (click)="close.emit()"
          class="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-soft hover:bg-surface-strong text-ink flex items-center justify-center transition-colors"
        >
          ✕
        </button>

        <!-- Header -->
        <div class="mb-5">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-7 h-7 rounded-full bg-rausch flex items-center justify-center text-white text-xs font-bold">TF</span>
            <span class="font-title-md font-bold text-ink">TableFlow</span>
          </div>
          <h3 class="font-display-sm text-ink">
            {{ isRegisterMode ? 'Create your account' : 'Welcome to TableFlow' }}
          </h3>
          <p class="font-body-sm text-muted mt-0.5">
            {{ isRegisterMode ? 'Register to save your orders and order history' : 'Log in to browse the menu and order directly from your table' }}
          </p>
        </div>

        <!-- Generic Error Banner -->
        @if (generalError) {
          <div class="mb-4 p-3 rounded-sm bg-rausch/10 border border-rausch/20 text-rausch font-body-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{{ generalError }}</span>
          </div>
        }

        <!-- Auth Form -->
        <form (ngSubmit)="submitForm()" class="space-y-3">
          @if (isRegisterMode) {
            <div>
              <label class="block font-caption text-ink mb-1">Full Name</label>
              <input
                type="text"
                [(ngModel)]="name"
                name="name"
                required
                placeholder="e.g. Rina Anggraini"
                class="w-full h-12 px-3 rounded-sm border border-hairline focus:border-ink outline-none text-sm text-ink placeholder:text-muted"
              />
            </div>
          }

          <div>
            <label class="block font-caption text-ink mb-1">Email Address</label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              placeholder="e.g. name@example.com"
              class="w-full h-12 px-3 rounded-sm border border-hairline focus:border-ink outline-none text-sm text-ink placeholder:text-muted"
            />
            @if (emailError) {
              <span class="text-xs text-rausch mt-1 block">{{ emailError }}</span>
            }
          </div>

          <div>
            <label class="block font-caption text-ink mb-1">Password</label>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              placeholder="At least 8 characters"
              class="w-full h-12 px-3 rounded-sm border border-hairline focus:border-ink outline-none text-sm text-ink placeholder:text-muted"
            />
            @if (passwordError) {
              <span class="text-xs text-rausch mt-1 block">{{ passwordError }}</span>
            }
          </div>

          @if (isRegisterMode) {
            <div>
              <label class="block font-caption text-ink mb-1">Confirm Password</label>
              <input
                type="password"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                required
                placeholder="Repeat password"
                class="w-full h-12 px-3 rounded-sm border border-hairline focus:border-ink outline-none text-sm text-ink placeholder:text-muted"
              />
              @if (confirmPasswordError) {
                <span class="text-xs text-rausch mt-1 block">{{ confirmPasswordError }}</span>
              }
            </div>
          }

          <!-- Submit Button -->
          <button
            type="submit"
            [disabled]="loading"
            class="w-full h-12 rounded-sm bg-rausch hover:bg-rausch-active text-white font-medium text-sm transition-colors mt-2 shadow-sm disabled:opacity-50"
          >
            {{ loading ? 'Processing...' : (isRegisterMode ? 'Register Account' : 'Log In') }}
          </button>
        </form>

        <!-- Toggle Mode -->
        <div class="mt-4 pt-4 border-t border-hairline text-center">
          <p class="font-body-sm text-muted">
            {{ isRegisterMode ? 'Already have an account?' : "Don't have an account yet?" }}
            <button
              type="button"
              (click)="toggleMode()"
              class="text-rausch font-semibold hover:underline ml-1"
            >
              {{ isRegisterMode ? 'Log In' : 'Register' }}
            </button>
          </p>
        </div>
      </div>
    </div>
  `
})
export class LoginModalComponent {
  @Output() close = new EventEmitter<void>();

  private authService = inject(AuthService);

  isRegisterMode = false;
  loading = false;
  generalError = '';
  emailError = '';
  passwordError = '';
  confirmPasswordError = '';

  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  toggleMode(): void {
    this.isRegisterMode = !this.isRegisterMode;
    this.resetErrors();
  }

  private resetErrors(): void {
    this.generalError = '';
    this.emailError = '';
    this.passwordError = '';
    this.confirmPasswordError = '';
  }

  submitForm(): void {
    this.resetErrors();

    if (this.isRegisterMode) {
      if (this.password.length < 8) {
        this.passwordError = 'Password must be at least 8 characters';
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.confirmPasswordError = 'Passwords do not match';
        return;
      }

      this.loading = true;
      this.authService.register({
        name: this.name,
        email: this.email,
        password: this.password,
        confirmPassword: this.confirmPassword
      }).subscribe({
        next: () => {
          this.loading = false;
          this.close.emit();
        },
        error: (err) => {
          this.loading = false;
          if (err.status === 409 || err.error?.message?.toLowerCase().includes('already registered')) {
            this.emailError = 'Email already registered';
          } else if (err.error?.message) {
            this.generalError = err.error.message;
          } else {
            this.generalError = 'Registration failed. Please check your data.';
          }
        }
      });
    } else {
      this.loading = true;
      this.authService.login({
        email: this.email,
        password: this.password
      }).subscribe({
        next: () => {
          this.loading = false;
          this.close.emit();
        },
        error: (err) => {
          this.loading = false;
          // Per Acceptance Criteria: Generic error that does not reveal email or password
          if (err.status === 401) {
            this.generalError = err.error?.message || 'Invalid email or password';
          } else {
            this.generalError = err.error?.message || 'Login failed. Please check your connection.';
          }
        }
      });
    }
  }
}
