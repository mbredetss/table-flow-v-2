export interface MenuCategory {
  id: string;
  name: string;
  created_at?: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  photo: string;
  price: number;
  is_available: boolean;
  category?: {
    id: string;
    name: string;
  };
  created_at?: string;
  updated_at?: string;
}

export type MenuItemDetail = MenuItem;

export interface CreateMenuItemRequest {
  name: string;
  description: string;
  price: number;
  category_id: string;
  photo?: File;
}

export interface UpdateMenuItemRequest {
  name?: string;
  description?: string;
  price?: number;
  category_id?: string;
  photo?: File;
  is_available?: boolean;
}
