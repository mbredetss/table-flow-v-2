import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { Table, CreateTableRequest } from '../models/table.model';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  status: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class TableService {
  private http = inject(HttpClient);

  readonly tables = signal<Table[]>([]);

  getTables(): Observable<Table[]> {
    return this.http.get<ApiResponse<Table[]>>(`${environment.apiUrl}/admin/tables`).pipe(
      map(res => res.data || []),
      tap(tables => this.tables.set(tables))
    );
  }

  createTable(tableNumber: string): Observable<Table> {
    const payload: CreateTableRequest = { table_number: tableNumber };
    return this.http.post<ApiResponse<Table>>(`${environment.apiUrl}/admin/tables`, payload).pipe(
      map(res => res.data),
      tap(newTable => {
        this.tables.update(list => [...list, newTable]);
      })
    );
  }

  deleteTable(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/admin/tables/${id}`).pipe(
      tap(() => {
        this.tables.update(list => list.filter(t => t.id !== id));
      })
    );
  }

  /**
   * Downloads the table QR code PNG from the backend endpoint: GET /admin/tables/{id}/qrcode
   */
  downloadQRCode(table: Table): void {
    this.http.get(`${environment.apiUrl}/admin/tables/${table.id}/qrcode`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `table-${table.table_number}-qr.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Failed to download QR code', err);
      }
    });
  }
}
