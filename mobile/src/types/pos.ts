export type TableStatus = 'FREE' | 'OCCUPIED' | 'RESERVED';
export type OrderStatus = 'OPEN' | 'PREPARING' | 'READY' | 'SERVED' | 'PAID' | 'CANCELLED';
export type OrderItemStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
export type PaymentMethod = 'NONE' | 'CASH' | 'CARD';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  photoUrl?: string | null;
  isAvailable: boolean;
  sortOrder: number;
  category?: MenuCategory;
}

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  number: number;
  label?: string | null;
  capacity: number;
  status: TableStatus;
  orders?: PosOrder[];
}

export interface PosOrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  notes?: string | null;
  status: OrderItemStatus;
  menuItem?: MenuItem;
}

export interface PosOrder {
  id: string;
  restaurantId: string;
  tableId: string;
  createdById: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string | null;
  createdAt: string;
  items: PosOrderItem[];
  table?: RestaurantTable;
}
