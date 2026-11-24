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
}
