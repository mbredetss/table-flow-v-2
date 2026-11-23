import { Component, ElementRef, EventEmitter, OnDestroy, AfterViewInit, Output, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsQR from 'jsqr';
import { CartService } from '../../core/services/cart.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-qr-scanner-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[3px] animate-in fade-in">
      <div class="bg-canvas w-full max-w-md rounded-md p-6 shadow-airbnb-modal relative max-h-[90vh] overflow-y-auto">
        <!-- Close Button -->
        <button
          type="button"
          (click)="handleClose()"
          class="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-surface-soft hover:bg-surface-strong text-ink flex items-center justify-center transition-colors"
        >
          ✕
        </button>

        <div class="text-center mb-4">
          <div class="w-12 h-12 rounded-full bg-rausch/10 text-rausch flex items-center justify-center mx-auto mb-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1.5" stroke-width="2"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5" stroke-width="2"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5" stroke-width="2"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5" stroke-width="2"/>
            </svg>
          </div>
          <h3 class="font-display-sm text-ink">Scan Meja / Table QR</h3>
          <p class="font-body-sm text-muted mt-0.5">
            Arahkan kamera ke stiker QR code yang ada di atas meja Anda
          </p>
        </div>

        <!-- Camera Viewfinder Container -->
        <div class="relative w-full aspect-square max-w-[280px] mx-auto rounded-md bg-black overflow-hidden mb-5 border-2 border-hairline shadow-inner flex items-center justify-center">
          <!-- Video Stream -->
          <video
            #videoElement
            playsinline
            autoplay
            muted
            class="w-full h-full object-cover"
            [ngClass]="{ 'hidden': !cameraActive() }"
          ></video>

          <!-- Hidden Canvas for QR Frame Extraction -->
          <canvas #canvasElement class="hidden"></canvas>

          <!-- Scanning Overlay Frame -->
          @if (cameraActive()) {
            <div class="absolute inset-6 border-2 border-rausch/80 rounded-sm pointer-events-none">
              <!-- Corner brackets -->
              <div class="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-rausch"></div>
              <div class="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-rausch"></div>
              <div class="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-rausch"></div>
              <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-rausch"></div>

              <!-- Animated Scanline -->
              <div class="w-full h-0.5 bg-rausch shadow-[0_0_10px_#ff385c] absolute top-0 left-0 animate-[scan_2s_ease-in-out_infinite]"></div>
            </div>

            <div class="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-3 py-1 rounded-full pointer-events-none">
              Mendeteksi QR Meja...
            </div>
          }

          <!-- Camera Loading Indicator -->
          @if (cameraLoading()) {
            <div class="absolute inset-0 bg-canvas flex flex-col items-center justify-center p-4 text-center">
              <div class="animate-spin w-8 h-8 border-2 border-rausch border-t-transparent rounded-full mb-2"></div>
              <p class="text-xs text-muted font-medium">Menyalakan kamera...</p>
            </div>
          }

          <!-- Camera Error or Inactive State -->
          @if (!cameraActive() && !cameraLoading()) {
            <div class="absolute inset-0 bg-surface-soft flex flex-col items-center justify-center p-4 text-center">
              <span class="text-3xl mb-2">📷</span>
              <p class="text-xs font-semibold text-ink mb-1">Kamera Belum Aktif</p>
              @if (cameraError()) {
                <p class="text-[11px] text-rausch mb-3 max-w-[220px]">
                  {{ cameraError() }}
                </p>
              } @else {
                <p class="text-[11px] text-muted mb-3 max-w-[220px]">
                  Izinkan akses kamera di browser Anda untuk memindai QR code meja
                </p>
              }

              <button
                type="button"
                (click)="startCamera()"
                class="px-4 py-2 rounded-sm bg-rausch hover:bg-rausch-active text-white text-xs font-semibold transition shadow-sm"
              >
                Nyalakan Kamera
              </button>
            </div>
          }
        </div>

        @if (cameraActive()) {
          <div class="text-center mb-4">
            <button
              type="button"
              (click)="stopCamera()"
              class="text-xs text-muted hover:text-rausch transition underline"
            >
              Matikan Kamera
            </button>
          </div>
        }

        <!-- Manual Table Input Fallback -->
        <div class="pt-3 border-t border-hairline">
          <form (ngSubmit)="submitCustomTable()" class="space-y-3">
            <div>
              <label class="block font-caption text-ink mb-1 font-semibold">
                Atau Masukkan Nomor Meja Manual:
              </label>
              <div class="flex gap-2">
                <input
                  type="text"
                  [(ngModel)]="manualTableNumber"
                  name="manualTableNumber"
                  placeholder="Contoh: 01, 04, 12, atau A3"
                  class="flex-1 h-11 px-3 rounded-sm border border-hairline focus:border-ink outline-none text-xs text-ink placeholder:text-muted"
                  required
                />
                <button
                  type="submit"
                  class="h-11 px-5 rounded-sm bg-ink hover:bg-black text-white font-medium text-xs transition-colors shadow-sm"
                >
                  Hubungkan
                </button>
              </div>
            </div>
          </form>

          @if (cartService.tableNumber()) {
            <div class="mt-3 pt-3 border-t border-hairline flex items-center justify-between text-xs text-muted">
              <span>Terhubung dengan: <strong class="text-ink">Meja {{ cartService.tableNumber() }}</strong></span>
              <button
                type="button"
                (click)="cartService.clearTableNumber()"
                class="text-rausch hover:underline"
              >
                Putus Koneksi
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes scan {
      0% { top: 0%; opacity: 0.8; }
      50% { top: 96%; opacity: 1; }
      100% { top: 0%; opacity: 0.8; }
    }
  `]
})
export class QrScannerModalComponent implements AfterViewInit, OnDestroy {
  @Output() close = new EventEmitter<void>();

  @ViewChild('videoElement') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasRef?: ElementRef<HTMLCanvasElement>;

  readonly cartService = inject(CartService);
  private notificationService = inject(NotificationService);

  readonly cameraActive = signal<boolean>(false);
  readonly cameraLoading = signal<boolean>(false);
  readonly cameraError = signal<string | null>(null);

  manualTableNumber = this.cartService.tableNumber() || '';

  private mediaStream: MediaStream | null = null;
  private scanAnimationId: number | null = null;

  ngAfterViewInit(): void {
    // Automatically attempt to turn on camera when modal opens
    this.startCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  handleClose(): void {
    this.stopCamera();
    this.close.emit();
  }

  async startCamera(): Promise<void> {
    this.cameraLoading.set(true);
    this.cameraError.set(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.cameraLoading.set(false);
      this.cameraError.set('Browser Anda tidak mendukung akses kamera secara langsung.');
      return;
    }

    try {
      // Prefer rear camera on mobile devices
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (this.videoRef && this.videoRef.nativeElement) {
        const video = this.videoRef.nativeElement;
        video.srcObject = this.mediaStream;
        video.setAttribute('playsinline', 'true');
        await video.play();

        this.cameraActive.set(true);
        this.cameraLoading.set(false);

        // Start scanning frames for QR codes
        this.startScanning();
      } else {
        this.cameraLoading.set(false);
      }
    } catch (err: any) {
      this.cameraLoading.set(false);
      this.cameraActive.set(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.cameraError.set('Izin kamera ditolak. Mohon aktifkan izin kamera pada browser Anda.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.cameraError.set('Tidak ditemukan perangkat kamera pada perangkat ini.');
      } else {
        this.cameraError.set('Gagal mengaktifkan kamera. Anda dapat memasukkan nomor meja secara manual.');
      }
    }
  }

  stopCamera(): void {
    if (this.scanAnimationId !== null) {
      cancelAnimationFrame(this.scanAnimationId);
      this.scanAnimationId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      this.mediaStream = null;
    }

    if (this.videoRef && this.videoRef.nativeElement) {
      this.videoRef.nativeElement.srcObject = null;
    }

    this.cameraActive.set(false);
    this.cameraLoading.set(false);
  }

  private startScanning(): void {
    const scan = () => {
      if (!this.cameraActive()) return;

      const video = this.videoRef?.nativeElement;
      const canvas = this.canvasRef?.nativeElement;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Decode with jsQR
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data) {
            this.handleDecodedQr(code.data);
            return; // Stop scan loop on match
          }
        }
      }

      this.scanAnimationId = requestAnimationFrame(scan);
    };

    this.scanAnimationId = requestAnimationFrame(scan);
  }

  private handleDecodedQr(rawText: string): void {
    let tableNumber = rawText.trim();

    // 1. Try parsing JSON format: { app: 'TableFlow', table: '04', ... }
    try {
      const parsed = JSON.parse(tableNumber);
      if (parsed && parsed.table) {
        tableNumber = String(parsed.table);
      }
    } catch {
      // 2. Try parsing URL query: http://.../?table=04
      if (tableNumber.includes('table=')) {
        const match = tableNumber.match(/table=([^&/#?]+)/);
        if (match && match[1]) {
          tableNumber = match[1];
        }
      }
    }

    // Vibrate haptic feedback on mobile if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(150); } catch { }
    }

    this.applyTableNumber(tableNumber);
  }

  submitCustomTable(): void {
    if (!this.manualTableNumber.trim()) return;
    this.applyTableNumber(this.manualTableNumber.trim());
  }

  private applyTableNumber(table: string): void {
    this.stopCamera();
    this.cartService.setTableNumber(table);
    this.notificationService.show({
      type: 'success',
      title: 'Meja Terhubung!',
      message: `Berhasil terhubung ke Meja #${table}`,
      duration: 3500
    });
    this.close.emit();
  }
}
