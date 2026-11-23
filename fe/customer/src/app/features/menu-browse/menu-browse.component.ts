import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuService } from '../../core/services/menu.service';
import { CartService } from '../../core/services/cart.service';
import { MenuCategory, MenuItem } from '../../core/models/menu.model';
import { ItemDetailModalComponent } from '../item-detail-modal/item-detail-modal.component';

@Component({
  selector: 'app-menu-browse',
  standalone: true,
  imports: [CommonModule, FormsModule, ItemDetailModalComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Signature Airbnb Pill Search Bar -->
      <div class="max-w-2xl mx-auto mb-8">
        <div class="h-16 rounded-full border border-hairline shadow-airbnb hover:shadow-md transition-shadow flex items-center px-4 bg-canvas justify-between">
          <div class="flex-1 flex items-center divide-x divide-hairline">
            <div class="px-4 flex-1">
              <span class="block text-[10px] uppercase font-bold tracking-wider text-ink">Search Dishes</span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="filterItems()"
                placeholder="Search food, coffee, desserts..."
                class="w-full text-xs text-ink outline-none bg-transparent placeholder:text-muted"
              />
            </div>
            <div class="px-4 hidden sm:block">
              <span class="block text-[10px] uppercase font-bold tracking-wider text-ink">Category</span>
              <span class="text-xs text-muted truncate max-w-[120px] block">
                {{ selectedCategoryName() }}
              </span>
            </div>
          </div>

          <!-- Circular Rausch Search Orb -->
          <button
            type="button"
            (click)="filterItems()"
            class="w-12 h-12 rounded-full bg-rausch hover:bg-rausch-active text-white flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95"
            aria-label="Search"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Category Filter Strip -->
      <div class="flex items-center gap-3 overflow-x-auto pb-4 mb-6 scrollbar-none border-b border-hairline">
        <!-- All Menu Option -->
        <button
          type="button"
          (click)="selectCategory('')"
          class="px-5 py-2.5 rounded-full text-sm font-semibold transition shrink-0 flex items-center gap-2"
          [ngClass]="{
            'bg-ink text-white shadow-sm': selectedCategoryId() === '',
            'bg-surface-soft hover:bg-surface-strong text-muted hover:text-ink': selectedCategoryId() !== ''
          }"
        >
          <span>✨</span>
          <span>All Menu</span>
        </button>

        @for (cat of categories(); track cat.id) {
          <button
            type="button"
            (click)="selectCategory(cat.id)"
            class="px-5 py-2.5 rounded-full text-sm font-semibold transition shrink-0 flex items-center gap-2"
            [ngClass]="{
              'bg-ink text-white shadow-sm': selectedCategoryId() === cat.id,
              'bg-surface-soft hover:bg-surface-strong text-muted hover:text-ink': selectedCategoryId() !== cat.id
            }"
          >
            <span>🍽️</span>
            <span>{{ cat.name }}</span>
          </button>
        }
      </div>

      <!-- Menu Items Grid (Airbnb Property Card Aesthetic) -->
      @if (loading()) {
        <!-- Skeletons -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          @for (i of [1,2,3,4,5,6,7,8]; track i) {
            <div class="rounded-md border border-hairline overflow-hidden p-3 animate-pulse bg-surface-soft/40">
              <div class="w-full aspect-square rounded-md bg-hairline/60 mb-3"></div>
              <div class="h-4 bg-hairline/60 rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-hairline/40 rounded w-full mb-3"></div>
              <div class="h-5 bg-hairline/60 rounded w-1/3"></div>
            </div>
          }
        </div>
      } @else if (filteredItems().length === 0) {
        <!-- Empty State per Acceptance Criteria -->
        <div class="py-20 text-center">
          <div class="w-16 h-16 rounded-full bg-surface-soft text-2xl flex items-center justify-center mx-auto mb-3">
            🍽️
          </div>
          <h3 class="font-display-sm text-ink font-semibold">No menu items found</h3>
          <p class="font-body-sm text-muted mt-1 max-w-sm mx-auto">
            @if (searchQuery) {
              No dishes match your search query "{{ searchQuery }}".
            } @else {
              There are currently no items available in this category.
            }
          </p>
          @if (searchQuery || selectedCategoryId()) {
            <button
              type="button"
              (click)="resetFilters()"
              class="mt-4 px-4 py-2 rounded-full border border-hairline text-xs font-semibold hover:border-ink transition"
            >
              Show All Dishes
            </button>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          @for (item of filteredItems(); track item.id) {
            <div
              (click)="openDetail(item)"
              class="group cursor-pointer rounded-md bg-canvas border border-hairline hover:shadow-airbnb transition-all duration-200 flex flex-col overflow-hidden"
            >
              <!-- 1:1 Photo Plate -->
              <div class="relative w-full aspect-square bg-surface-soft overflow-hidden">
                <img
                  [src]="item.photo"
                  [alt]="item.name"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                <!-- Sold Out Badge Overlay (Per PRD: remains visible with Sold Out badge) -->
                @if (!item.is_available) {
                  <div class="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                    <span class="px-3 py-1 rounded-full bg-ink text-white font-badge uppercase tracking-wider shadow-md">
                      Sold Out
                    </span>
                  </div>
                }

                <!-- Heart Favorite Button -->
                <button
                  type="button"
                  (click)="$event.stopPropagation(); toggleFavorite(item.id)"
                  class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-ink flex items-center justify-center shadow-sm transition active:scale-90 z-20"
                  aria-label="Save dish"
                >
                  <svg
                    class="w-4 h-4 transition"
                    [ngClass]="{ 'text-rausch fill-rausch': favorites().has(item.id), 'text-ink': !favorites().has(item.id) }"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    fill="none"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>

              <!-- Meta Block -->
              <div class="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 class="font-title-md text-ink font-bold line-clamp-1 group-hover:text-rausch transition-colors">
                    {{ item.name }}
                  </h4>
                  <p class="font-body-sm text-muted line-clamp-2 leading-snug mb-3 mt-1">
                    {{ item.description }}
                  </p>
                </div>

                <!-- Price & Add Button Row -->
                <div class="flex items-center justify-between pt-2 border-t border-hairline-soft">
                  <span class="font-title-md font-bold text-ink">
                    Rp {{ item.price.toLocaleString('id-ID') }}
                  </span>

                  @if (item.is_available) {
                    <button
                      type="button"
                      (click)="$event.stopPropagation(); quickAdd(item)"
                      class="px-3.5 py-1.5 rounded-full bg-rausch hover:bg-rausch-active text-white text-xs font-semibold transition shadow-sm flex items-center gap-1 active:scale-95"
                    >
                      <span>+ Add</span>
                    </button>
                  } @else {
                    <button
                      type="button"
                      disabled
                      class="px-3 py-1.5 rounded-full bg-surface-strong text-muted text-xs font-semibold cursor-not-allowed opacity-70"
                    >
                      Sold Out
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Item Detail Modal -->
    @if (selectedItem()) {
      <app-item-detail-modal
        [item]="selectedItem()"
        (close)="selectedItem.set(null)"
      ></app-item-detail-modal>
    }
  `
})
export class MenuBrowseComponent implements OnInit {
  private menuService = inject(MenuService);
  private cartService = inject(CartService);

  readonly categories = signal<MenuCategory[]>([]);
  readonly allItems = signal<MenuItem[]>([]);
  readonly filteredItems = signal<MenuItem[]>([]);
  readonly selectedCategoryId = signal<string>('');
  readonly selectedItem = signal<MenuItem | null>(null);
  readonly loading = signal<boolean>(true);
  readonly favorites = signal<Set<string>>(new Set());

  searchQuery = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.menuService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => this.categories.set([])
    });

    this.menuService.getItems().subscribe({
      next: (items) => {
        this.allItems.set(items);
        this.filterItems();
        this.loading.set(false);
      },
      error: () => {
        this.allItems.set([]);
        this.filteredItems.set([]);
        this.loading.set(false);
      }
    });
  }

  selectCategory(id: string): void {
    this.selectedCategoryId.set(id);
    this.loading.set(true);
    this.menuService.getItems(id || undefined).subscribe({
      next: (items) => {
        this.allItems.set(items);
        this.filterItems();
        this.loading.set(false);
      },
      error: () => {
        this.allItems.set([]);
        this.filteredItems.set([]);
        this.loading.set(false);
      }
    });
  }

  selectedCategoryName(): string {
    const id = this.selectedCategoryId();
    if (!id) return 'All Menu';
    const found = this.categories().find(c => c.id === id);
    return found ? found.name : 'All Menu';
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectCategory('');
  }

  filterItems(): void {
    const query = this.searchQuery.toLowerCase().trim();
    let result = this.allItems();

    if (query) {
      result = result.filter(it =>
        it.name.toLowerCase().includes(query) ||
        (it.description && it.description.toLowerCase().includes(query))
      );
    }

    this.filteredItems.set(result);
  }

  openDetail(item: MenuItem): void {
    this.selectedItem.set(item);
  }

  quickAdd(item: MenuItem): void {
    this.cartService.addToCart(item, 1, '');
  }

  toggleFavorite(id: string): void {
    const current = new Set(this.favorites());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.favorites.set(current);
  }
}

