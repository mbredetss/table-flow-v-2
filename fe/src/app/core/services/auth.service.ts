import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.model';

const TOKEN_KEY = 'tableflow_access_token';
const USER_KEY = 'tableflow_user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly currentUser = signal<User | null>(this.loadStoredUser());
  readonly accessToken = signal<string | null>(this.loadStoredToken());

  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly userRole = computed(() => this.currentUser()?.role ?? null);
  readonly isCustomer = computed(() => this.userRole() === 'customer');
  readonly isCashier = computed(() => this.userRole() === 'cashier');
  readonly isAdmin = computed(() => this.userRole() === 'admin');
  readonly isStaff = computed(() => this.isCashier() || this.isAdmin());

  private loadStoredUser(): User | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private loadStoredToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  getToken(): string | null {
    return this.accessToken();
  }

  private setSession(token: string, user: User): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    this.accessToken.set(token);
    this.currentUser.set(user);
  }

  login(credentials: LoginRequest): Observable<{ accessToken: string; user: User }> {
    return this.http.post<AuthResponse>('/auth/login', credentials, { withCredentials: true }).pipe(
      map((res) => {
        const token = res.data.accessToken;
        const user = res.data.user;
        this.setSession(token, user);
        return { accessToken: token, user };
      })
    );
  }

  register(payload: RegisterRequest): Observable<{ accessToken: string; user: User }> {
    return this.http.post<AuthResponse>('/users', payload, { withCredentials: true }).pipe(
      map((res) => {
        const token = res.data.accessToken;
        const user = res.data.user;
        this.setSession(token, user);
        return { accessToken: token, user };
      })
    );
  }

  logout(): void {
    this.http.delete('/auth/logout', { withCredentials: true }).subscribe({
      next: () => this.clearSessionAndRedirect(),
      error: () => this.clearSessionAndRedirect()
    });
  }

  private clearSessionAndRedirect(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }
}
