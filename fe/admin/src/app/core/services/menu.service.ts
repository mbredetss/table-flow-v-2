import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MenuCategory, MenuItem } from '../models/menu.model';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  status: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private http = inject(HttpClient);

  getCategories(): Observable<MenuCategory[]> {
    return this.http.get<ApiResponse<MenuCategory[]>>(`${environment.apiUrl}/menu/categories`).pipe(
      map(res => res.data || [])
    );
  }

  getItems(categoryId?: string): Observable<MenuItem[]> {
    let params = new HttpParams();
    if (categoryId && categoryId !== 'cat-all') {
      params = params.set('category_id', categoryId);
    }

    return this.http.get<ApiResponse<MenuItem[]>>(`${environment.apiUrl}/menu/items`, { params }).pipe(
      map(res => res.data || [])
    );
  }

  getItemDetail(id: string): Observable<MenuItem> {
    return this.http.get<ApiResponse<MenuItem>>(`${environment.apiUrl}/menu/items/${id}`).pipe(
      map(res => res.data)
    );
  }

  // --- Admin Endpoints ---

  getAdminItems(): Observable<MenuItem[]> {
    return this.http.get<ApiResponse<MenuItem[]>>(`${environment.apiUrl}/admin/menu/items`).pipe(
      map(res => res.data || [])
    );
  }

  createMenuItem(formData: FormData): Observable<MenuItem> {
    return this.http.post<ApiResponse<MenuItem>>(`${environment.apiUrl}/admin/menu/items`, formData).pipe(
      map(res => res.data)
    );
  }

  updateMenuItem(id: string, formData: FormData): Observable<MenuItem> {
    return this.http.patch<ApiResponse<MenuItem>>(`${environment.apiUrl}/admin/menu/items/${id}`, formData).pipe(
      map(res => res.data)
    );
  }

  toggleAvailability(id: string): Observable<{ id: string; is_available: boolean }> {
    return this.http.patch<ApiResponse<{ id: string; is_available: boolean }>>(`${environment.apiUrl}/admin/menu/items/${id}/availability`, {}).pipe(
      map(res => res.data)
    );
  }

  deleteMenuItem(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/admin/menu/items/${id}`);
  }
}
