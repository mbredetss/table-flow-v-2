import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-notification-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (notificationService.activeNotification(); as notif) {
      <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 transition-all duration-300 animate-in fade-in slide-in-from-top-4">
        <div
          class="flex items-start justify-between p-4 bg-canvas rounded-md shadow-airbnb border"
          [ngClass]="{
            'border-rausch bg-rausch/5': notif.type === 'ready',
            'border-hairline': notif.type !== 'ready'
          }"
        >
          <div class="flex items-start gap-3">
            @if (notif.type === 'ready') {
              <div class="w-9 h-9 rounded-full bg-rausch text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce">
                🎉
              </div>
            } @else if (notif.type === 'info') {
              <div class="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center shrink-0">
                🔔
              </div>
            } @else if (notif.type === 'success') {
              <div class="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                ✓
              </div>
            } @else {
              <div class="w-9 h-9 rounded-full bg-rausch-error text-white flex items-center justify-center shrink-0">
                !
              </div>
            }

            <div>
              <h4 class="font-title-sm text-ink font-semibold">{{ notif.title }}</h4>
              <p class="font-body-sm text-body mt-0.5">{{ notif.message }}</p>
            </div>
          </div>

          <button
            type="button"
            (click)="notificationService.dismiss()"
            class="text-muted hover:text-ink p-1 rounded-full hover:bg-surface-soft transition-colors ml-3"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      </div>
    }
  `
})
export class NotificationBannerComponent {
  readonly notificationService = inject(NotificationService);
}
