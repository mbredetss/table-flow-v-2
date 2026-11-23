import { Injectable, signal, computed } from '@angular/core';
import { MenuItem } from '../models/menu.model';

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note: string;
}

const CART_KEY = 'tableflow_cart';
const TABLE_KEY = 'table_number';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  readonly items = signal<CartItem[]>(this.loadStoredCart());
  readonly tableNumber = signal<string | null>(this.loadStoredTable());

  readonly itemCount = computed(() => {
    return this.items().reduce((total, item) => total + item.quantity, 0);
  });

  readonly totalPrice = computed(() => {
    return this.items().reduce((total, item) => total + (item.menuItem.price * item.quantity), 0);
  });

  readonly isCartEmpty = computed(() => this.items().length === 0);

  private loadStoredCart(): CartItem[] {
    if (typeof sessionStorage === 'undefined') return [];
    const stored = sessionStorage.getItem(CART_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  private saveStoredCart(items: CartItem[]): void {
    this.items.set(items);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(CART_KEY, JSON.stringify(items));
    }
  }

  private loadStoredTable(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(TABLE_KEY);
  }

  setTableNumber(table: string): void {
    const cleaned = table.trim();
    this.tableNumber.set(cleaned);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TABLE_KEY, cleaned);
    }
  }

  clearTableNumber(): void {
    this.tableNumber.set(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TABLE_KEY);
    }
  }

  addToCart(menuItem: MenuItem, quantity: number = 1, note: string = ''): boolean {
    if (!menuItem.is_available) {
      return false; // Guard against sold out
    }

    const current = [...this.items()];
    const existingIndex = current.findIndex(
      it => it.menuItem.id === menuItem.id && it.note === (note || '')
    );

    if (existingIndex > -1) {
      current[existingIndex] = {
        ...current[existingIndex],
        quantity: current[existingIndex].quantity + quantity
      };
    } else {
      current.push({
        menuItem,
        quantity,
        note: note || ''
      });
    }

    this.saveStoredCart(current);
    return true;
  }

  updateQuantity(index: number, quantity: number): void {
    const current = [...this.items()];
    if (index < 0 || index >= current.length) return;

    if (quantity <= 0) {
      current.splice(index, 1);
    } else {
      current[index] = {
        ...current[index],
        quantity
      };
    }
    this.saveStoredCart(current);
  }

  updateNote(index: number, note: string): void {
    const current = [...this.items()];
    if (index < 0 || index >= current.length) return;

    current[index] = {
      ...current[index],
      note: note.slice(0, 255) // max 255 chars
    };
    this.saveStoredCart(current);
  }

  removeItem(index: number): void {
    const current = [...this.items()];
    if (index >= 0 && index < current.length) {
      current.splice(index, 1);
      this.saveStoredCart(current);
    }
  }

  clearCart(): void {
    this.saveStoredCart([]);
  }
}
