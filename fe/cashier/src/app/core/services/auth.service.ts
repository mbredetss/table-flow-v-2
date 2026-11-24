import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { User, UserRole, LoginRequest, RegisterRequest } from '../models/auth.model';
import { environment } from '../../../environments/environment';

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
  readonly userRole = computed(() => this.currentUser()?.role?.toLowerCase()?.trim() ?? null);
  readonly isCustomer = computed(() => this.userRole() === 'customer');
  readonly isCashier = computed(() => this.userRole() === 'cashier');
  readonly isAdmin = computed(() => this.userRole() === 'admin');
  readonly isStaff = computed(() => this.isCashier() || this.isAdmin());

  private extractJwtPayload(token: string): any {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  private loadStoredUser(): User | null {
    if (typeof localStorage === 'undefined') return null;
    const token = localStorage.getItem(TOKEN_KEY);
    const tokenPayload = token ? this.extractJwtPayload(token) : null;
    const raw = localStorage.getItem(USER_KEY);
    let user: any = null;
    if (raw) {
      try {
        user = JSON.parse(raw);
      } catch {
        user = null;
      }
    }
    if (!user && !tokenPayload) return null;

    const rawRole = user?.role || tokenPayload?.role || 'customer';
    const role = (rawRole || 'customer').toString().toLowerCase().trim() as UserRole;

    return {
      id: user?.id || tokenPayload?.id || tokenPayload?.sub || '',
      name: user?.name || tokenPayload?.name || '',
      email: user?.email || tokenPayload?.email || '',
      role: role
    };
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
    return this.http.post<any>(`${environment.apiUrl}/auth/login`, credentials, { withCredentials: true }).pipe(
      map((res: any) => {
        const data = res?.data ?? res;
        const token = data?.accessToken ?? data?.token ?? '';
        const tokenPayload = token ? this.extractJwtPayload(token) : null;
        const rawUser = data?.user ?? {};

        // Extract role from rawUser, or decode from JWT token payload, case-insensitively
        const rawRole = rawUser?.role || tokenPayload?.role || 'customer';
        const role = (rawRole || 'customer').toString().toLowerCase().trim() as UserRole;

        const user: User = {
          id: rawUser?.id || tokenPayload?.id || tokenPayload?.sub || '',
          name: rawUser?.name || tokenPayload?.name || '',
          email: rawUser?.email || tokenPayload?.email || '',
          role: role
        };

        this.setSession(token, user);
        return { accessToken: token, user };
      })
    );
  }

  register(payload: RegisterRequest): Observable<{ accessToken: string; user: User }> {
    return this.http.post<any>(`${environment.apiUrl}/users`, payload, { withCredentials: true }).pipe(
      map((res: any) => {
        const data = res?.data ?? res;
        const token = data?.accessToken ?? data?.token ?? '';
        const tokenPayload = token ? this.extractJwtPayload(token) : null;
        const rawUser = data?.user ?? {};

        const rawRole = rawUser?.role || tokenPayload?.role || 'customer';
        const role = (rawRole || 'customer').toString().toLowerCase().trim() as UserRole;

        const user: User = {
          id: rawUser?.id || tokenPayload?.id || tokenPayload?.sub || '',
          name: rawUser?.name || tokenPayload?.name || '',
          email: rawUser?.email || tokenPayload?.email || '',
          role: role
        };

        this.setSession(token, user);
        return { accessToken: token, user };
      })
    );
  }

  logout(): void {
    this.http.delete(`${environment.apiUrl}/auth/logout`, { withCredentials: true }).subscribe({
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
    this.router.navigate(['/login']);
  }
}
