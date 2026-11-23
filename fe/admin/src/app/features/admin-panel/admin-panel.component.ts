import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuService } from '../../core/services/menu.service';
import { TableService } from '../../core/services/table.service';
import { NotificationService } from '../../core/services/notification.service';
import { MenuCategory, MenuItem } from '../../core/models/menu.model';
import { Table } from '../../core/models/table.model';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Admin Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-full bg-rausch/10 text-rausch flex items-center justify-center font-bold text-sm">
              ⚙️
            </span>
            <h2 class="font-display-md text-ink">Restaurant Management</h2>
          </div>
          <p class="font-body-sm text-muted mt-1">
            Manage your digital menu items, instant sold-out availability, and table QR code stickers.
          </p>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center p-1 rounded-full bg-surface-soft border border-hairline shrink-0">
          <button
            type="button"
            (click)="activeTab = 'menu'"
            class="px-5 py-2 rounded-full text-xs font-semibold transition"
            [ngClass]="activeTab === 'menu' ? 'bg-canvas text-ink shadow-sm' : 'text-muted hover:text-ink'"
          >
            🍽️ Menu Items ({{ menuItems().length }})
          </button>
          <button
            type="button"
            (click)="activeTab = 'tables'"
            class="px-5 py-2 rounded-full text-xs font-semibold transition"
            [ngClass]="activeTab === 'tables' ? 'bg-canvas text-ink shadow-sm' : 'text-muted hover:text-ink'"
          >
            🪑 Tables & QR ({{ tables().length }})
          </button>
        </div>
      </div>

      <!-- ================= TAB 1: MENU MANAGEMENT ================= -->
      @if (activeTab === 'menu') {
        <div class="bg-canvas rounded-md border border-hairline shadow-sm overflow-hidden">
          <div class="p-5 border-b border-hairline bg-surface-soft/60 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 class="font-title-md font-bold text-ink">Food & Drinks Catalog</h3>
              <p class="text-xs text-muted">Toggle availability switch to instantly mark items as sold-out on customer menus.</p>
            </div>

            <button
              type="button"
              (click)="openAddModal()"
              class="px-4 py-2.5 rounded-sm bg-rausch hover:bg-rausch-active text-white text-xs font-semibold transition shadow-sm flex items-center gap-1.5"
            >
              <span>+ Add Menu Dish</span>
            </button>
          </div>

          <!-- Table of Menu Items -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-surface-soft border-b border-hairline text-muted uppercase tracking-wider font-semibold">
                <tr>
                  <th class="py-3 px-4">Dish</th>
                  <th class="py-3 px-4">Category</th>
                  <th class="py-3 px-4">Price</th>
                  <th class="py-3 px-4">Sold Out Toggle</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-hairline">
                @for (item of menuItems(); track item.id) {
                  <tr class="hover:bg-surface-soft/40 transition">
                    <td class="py-3.5 px-4">
                      <div class="flex items-center gap-3">
                        <img
                          [src]="item.photo"
                          [alt]="item.name"
                          class="w-12 h-12 rounded-sm object-cover border border-hairline shrink-0"
                        />
                        <div>
                          <span class="font-title-sm font-semibold text-ink block">{{ item.name }}</span>
                          <span class="text-[11px] text-muted line-clamp-1 max-w-xs">{{ item.description }}</span>
                        </div>
                      </div>
                    </td>

                    <td class="py-3.5 px-4 font-medium text-ink">
                      {{ item.category?.name || 'General' }}
                    </td>

                    <td class="py-3.5 px-4 font-bold text-ink">
                      Rp {{ item.price.toLocaleString('id-ID') }}
                    </td>

                    <td class="py-3.5 px-4">
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          [checked]="item.is_available"
                          (change)="toggleItemAvailability(item)"
                          class="sr-only peer"
                        />
                        <div class="w-10 h-5 bg-hairline peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-hairline after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        <span class="ml-2 text-xs font-semibold" [ngClass]="item.is_available ? 'text-emerald-700' : 'text-rausch'">
                          {{ item.is_available ? 'Available' : 'Sold Out' }}
                        </span>
                      </label>
                    </td>

                    <td class="py-3.5 px-4 text-right">
                      <div class="inline-flex items-center gap-2">
                        <button
                          type="button"
                          (click)="openEditModal(item)"
                          class="px-2.5 py-1 rounded-sm border border-hairline hover:border-ink text-ink font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          (click)="deleteItem(item.id)"
                          class="px-2.5 py-1 rounded-sm border border-rausch/30 text-rausch hover:bg-rausch/10 font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="py-12 text-center text-muted">
                      No menu items found. Tap "+ Add Menu Dish" to create your first item.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ================= TAB 2: TABLE & QR MANAGEMENT ================= -->
      @if (activeTab === 'tables') {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Add Table Form -->
          <div class="bg-canvas rounded-md border border-hairline p-5 shadow-sm h-fit">
            <h3 class="font-title-md font-bold text-ink mb-1">Add Restaurant Table</h3>
            <p class="text-xs text-muted mb-4">Create a unique table number and automatically generate scannable QR sticker.</p>

            <form (ngSubmit)="createTable()" class="space-y-4">
              <div>
                <label class="block font-caption text-ink mb-1">Table Number</label>
                <input
                  type="text"
                  [(ngModel)]="newTableNumber"
                  name="newTableNumber"
                  placeholder="e.g. 01, 04, 12, or A3"
                  class="w-full h-11 px-3 text-xs rounded-sm border border-hairline focus:border-ink outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                class="w-full h-11 rounded-sm bg-rausch hover:bg-rausch-active text-white text-xs font-semibold transition shadow-sm"
              >
                + Register Table & Generate QR
              </button>
            </form>
          </div>

          <!-- Table List Grid -->
          <div class="md:col-span-2 bg-canvas rounded-md border border-hairline p-5 shadow-sm">
            <h3 class="font-title-md font-bold text-ink mb-1">Active Table QR Codes</h3>
            <p class="text-xs text-muted mb-4">Download official QR stickers to print and affix onto physical dining tables.</p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              @for (tbl of tables(); track tbl.id) {
                <div class="p-4 rounded-md border border-hairline bg-surface-soft/40 flex items-center justify-between gap-3">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="w-8 h-8 rounded-full bg-ink text-white font-bold text-xs flex items-center justify-center">
                        {{ tbl.table_number }}
                      </span>
                      <div>
                        <h4 class="font-title-sm font-bold text-ink">Table {{ tbl.table_number }}</h4>
                        <span class="text-[10px] text-muted truncate max-w-[120px] inline-block">ID: {{ tbl.id }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="tableService.downloadQRCode(tbl)"
                      class="px-2.5 py-1.5 rounded-sm bg-canvas border border-hairline hover:border-ink text-xs font-semibold text-ink shadow-sm flex items-center gap-1"
                      title="Download PNG sticker"
                    >
                      <span>Download QR</span>
                      <span>📥</span>
                    </button>
                    <button
                      type="button"
                      (click)="deleteTable(tbl.id)"
                      class="p-1.5 text-muted hover:text-rausch rounded-sm transition"
                      title="Remove table"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="col-span-2 py-12 text-center text-muted text-xs">
                  No tables registered yet. Add a table number to generate a QR sticker.
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>

    <!-- ================= MODAL: ADD / EDIT MENU ITEM ================= -->
    @if (showItemModal) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-in fade-in">
        <div class="bg-canvas w-full max-w-lg rounded-md p-6 shadow-airbnb-modal relative max-h-[90vh] overflow-y-auto">
          <button
            type="button"
            (click)="showItemModal = false"
            class="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-soft hover:bg-surface-strong text-ink flex items-center justify-center"
          >
            ✕
          </button>

          <h3 class="font-display-sm text-ink mb-1">
            {{ isEditing ? 'Edit Menu Item' : 'Add New Menu Item' }}
          </h3>
          <p class="font-body-sm text-muted mb-4">Fill in dish details to publish immediately to customer mobile devices.</p>

          <!-- Server Error Banner -->
          @if (itemModalError) {
            <div class="mb-4 p-3.5 rounded-sm bg-rausch/10 border border-rausch/30 text-rausch text-xs flex items-start gap-2.5 animate-in fade-in">
              <span class="text-base shrink-0">⚠️</span>
              <div class="flex-1">
                <span class="font-bold block text-rausch">Terjadi kesalahan pada server:</span>
                <span class="font-medium text-body mt-0.5 block">{{ itemModalError }}</span>
              </div>
              <button
                type="button"
                (click)="itemModalError = null"
                class="text-rausch hover:opacity-75 p-0.5 ml-2 font-bold"
                title="Tutup pesan"
              >
                ✕
              </button>
            </div>
          }

          <form (ngSubmit)="saveMenuItem()" class="space-y-3">
            <div>
              <label class="block font-caption text-ink mb-1">Dish Name *</label>
              <input
                type="text"
                [(ngModel)]="itemForm.name"
                name="name"
                required
                placeholder="e.g. Nasi Liwet Gurih"
                class="w-full h-11 px-3 text-xs rounded-sm border border-hairline focus:border-ink outline-none"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-caption text-ink mb-1">Category *</label>
                <select
                  [(ngModel)]="itemForm.category_id"
                  name="category_id"
                  required
                  class="w-full h-11 px-3 text-xs rounded-sm border border-hairline focus:border-ink outline-none bg-canvas"
                >
                  @for (cat of categories(); track cat.id) {
                    <option [value]="cat.id">{{ cat.name }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block font-caption text-ink mb-1">Price (IDR) *</label>
                <input
                  type="number"
                  [(ngModel)]="itemForm.price"
                  name="price"
                  required
                  placeholder="35000"
                  class="w-full h-11 px-3 text-xs rounded-sm border border-hairline focus:border-ink outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block font-caption text-ink mb-1">Photo Upload (Image file) *</label>
              <input
                type="file"
                (change)="onFileSelected($event)"
                accept="image/*"
                class="w-full text-xs text-muted file:mr-3 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-surface-strong file:text-ink hover:file:bg-hairline"
              />
              @if (photoPreview) {
                <div class="mt-2 w-full h-28 rounded-sm overflow-hidden border border-hairline bg-surface-soft">
                  <img [src]="photoPreview" alt="Preview" class="w-full h-full object-cover" />
                </div>
              }
            </div>

            <div>
              <label class="block font-caption text-ink mb-1">Description</label>
              <textarea
                [(ngModel)]="itemForm.description"
                name="description"
                rows="2"
                placeholder="Fresh ingredients, savory spices..."
                class="w-full p-2.5 text-xs rounded-sm border border-hairline focus:border-ink outline-none resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              [disabled]="isSubmitting"
              class="w-full h-12 rounded-sm bg-rausch hover:bg-rausch-active text-white font-medium text-xs transition shadow-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              @if (isSubmitting) {
                <span class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                <span>Menyimpan ke server...</span>
              } @else {
                <span>{{ isEditing ? 'Update Dish' : 'Publish Dish' }}</span>
              }
            </button>
          </form>
        </div>
      </div>
    }
  `
})
export class AdminPanelComponent implements OnInit {
  private menuService = inject(MenuService);
  readonly tableService = inject(TableService);
  private notificationService = inject(NotificationService);

  activeTab: 'menu' | 'tables' = 'menu';

  readonly menuItems = signal<MenuItem[]>([]);
  readonly categories = signal<MenuCategory[]>([]);
  readonly tables = signal<Table[]>([]);

  showItemModal = false;
  isEditing = false;
  isSubmitting = false;
  editingItemId = '';
  itemModalError: string | null = null;
  newTableNumber = '';
  selectedPhotoFile: File | null = null;
  photoPreview: string | null = null;

  itemForm = {
    name: '',
    category_id: '',
    price: 30000,
    description: ''
  };

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.menuService.getAdminItems().subscribe({
      next: (items) => this.menuItems.set(items),
      error: () => this.menuItems.set([])
    });

    this.menuService.getCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        if (cats.length > 0 && !this.itemForm.category_id) {
          this.itemForm.category_id = cats[0].id;
        }
      }
    });

    this.tableService.getTables().subscribe({
      next: (tbls) => this.tables.set(tbls),
      error: () => this.tables.set([])
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedPhotoFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result as string;
      };
      reader.readAsDataURL(this.selectedPhotoFile);
    }
  }

  toggleItemAvailability(item: MenuItem): void {
    this.menuService.toggleAvailability(item.id).subscribe({
      next: (res) => {
        this.menuItems.update(list => list.map(it => it.id === item.id ? { ...it, is_available: res.is_available } : it));
        this.notificationService.show({
          type: 'info',
          title: 'Availability Toggled',
          message: `${item.name} is now ${res.is_available ? 'Available' : 'Sold Out'} on customer menus`,
          duration: 3000
        });
      },
      error: (err) => {
        this.notificationService.show({
          type: 'error',
          title: 'Error',
          message: err.error?.message || 'Failed to toggle availability',
          duration: 3000
        });
      }
    });
  }

  openAddModal(): void {
    this.isEditing = false;
    this.isSubmitting = false;
    this.editingItemId = '';
    this.itemModalError = null;
    this.selectedPhotoFile = null;
    this.photoPreview = null;
    this.itemForm = {
      name: '',
      category_id: this.categories()[0]?.id || '',
      price: 30000,
      description: ''
    };
    this.showItemModal = true;
  }

  openEditModal(item: MenuItem): void {
    this.isEditing = true;
    this.isSubmitting = false;
    this.editingItemId = item.id;
    this.itemModalError = null;
    this.selectedPhotoFile = null;
    this.photoPreview = item.photo;
    this.itemForm = {
      name: item.name,
      category_id: item.category_id,
      price: item.price,
      description: item.description
    };
    this.showItemModal = true;
  }

  saveMenuItem(): void {
    this.itemModalError = null;

    const formData = new FormData();
    formData.append('name', this.itemForm.name);
    formData.append('category_id', this.itemForm.category_id);
    formData.append('price', String(this.itemForm.price));
    formData.append('description', this.itemForm.description);

    if (this.selectedPhotoFile) {
      formData.append('photo', this.selectedPhotoFile);
    }

    if (this.isEditing) {
      this.isSubmitting = true;
      this.menuService.updateMenuItem(this.editingItemId, formData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showItemModal = false;
          this.loadData();
          this.notificationService.show({
            type: 'success',
            title: 'Dish Updated',
            message: `${this.itemForm.name} updated successfully`,
            duration: 3000
          });
        },
        error: (err) => {
          this.isSubmitting = false;
          const serverMessage = err.error?.message || err.error?.error || (typeof err.error === 'string' ? err.error : null) || err.message || 'Gagal memperbarui item menu.';
          this.itemModalError = serverMessage;
          this.notificationService.show({
            type: 'error',
            title: 'Error',
            message: serverMessage,
            duration: 4000
          });
        }
      });
    } else {
      if (!this.selectedPhotoFile) {
        this.itemModalError = 'Foto menu wajib dipilih (format image/jpeg atau image/png, maksimal 5MB).';
        return;
      }

      this.isSubmitting = true;
      this.menuService.createMenuItem(formData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showItemModal = false;
          this.loadData();
          this.notificationService.show({
            type: 'success',
            title: 'Dish Created',
            message: `${this.itemForm.name} published to menu`,
            duration: 3000
          });
        },
        error: (err) => {
          this.isSubmitting = false;
          const serverMessage = err.error?.message || err.error?.error || (typeof err.error === 'string' ? err.error : null) || err.message || 'Gagal menambahkan item menu baru.';
          this.itemModalError = serverMessage;
          this.notificationService.show({
            type: 'error',
            title: 'Error Server',
            message: serverMessage,
            duration: 4000
          });
        }
      });
    }
  }

  deleteItem(id: string): void {
    if (confirm('Are you sure you want to remove this dish from the menu?')) {
      this.menuService.deleteMenuItem(id).subscribe({
        next: () => {
          this.loadData();
          this.notificationService.show({
            type: 'info',
            title: 'Dish Deleted',
            message: 'Item removed from menu',
            duration: 3000
          });
        },
        error: (err) => {
          this.notificationService.show({
            type: 'error',
            title: 'Error',
            message: err.error?.message || 'Failed to delete dish',
            duration: 3000
          });
        }
      });
    }
  }

  createTable(): void {
    if (!this.newTableNumber.trim()) return;
    this.tableService.createTable(this.newTableNumber.trim()).subscribe({
      next: () => {
        this.newTableNumber = '';
        this.loadData();
        this.notificationService.show({
          type: 'success',
          title: 'Table Added',
          message: 'New table registered and QR code ready for download',
          duration: 3000
        });
      },
      error: (err) => {
        this.notificationService.show({
          type: 'error',
          title: 'Error',
          message: err.error?.message || 'Failed to create table',
          duration: 3000
        });
      }
    });
  }

  deleteTable(id: string): void {
    if (confirm('Delete this table?')) {
      this.tableService.deleteTable(id).subscribe({
        next: () => {
          this.loadData();
        },
        error: (err) => {
          this.notificationService.show({
            type: 'error',
            title: 'Error',
            message: err.error?.message || 'Failed to delete table',
            duration: 3000
          });
        }
      });
    }
  }
}

