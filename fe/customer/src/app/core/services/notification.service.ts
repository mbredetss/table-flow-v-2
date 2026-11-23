import { Injectable, signal } from '@angular/core';

export interface AppNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'ready';
  title: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  readonly activeNotification = signal<AppNotification | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(notification: Omit<AppNotification, 'id'>): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    const id = Math.random().toString(36).substring(2, 9);
    const fullNotification: AppNotification = {
      ...notification,
      id,
      duration: notification.duration ?? 6000
    };

    this.activeNotification.set(fullNotification);

    if (fullNotification.duration && fullNotification.duration > 0) {
      this.timer = setTimeout(() => {
        this.dismiss();
      }, fullNotification.duration);
    }
  }

  dismiss(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.activeNotification.set(null);
  }
}
