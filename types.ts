export enum UserRole {
  ADMIN = 'ADMIN',
  WORKER = 'WORKER',
  CUSTOMER = 'CUSTOMER'
}

export enum ProductType {
  ICE = 'ICE',
  WATER = 'WATER'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT = 'CREDIT',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DELIVERED = 'DELIVERED'
}

export enum ClientClassification {
  GOOD = 'GOOD',
  REGULAR = 'REGULAR',
  BAD = 'BAD'
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  business: string;
  lat: number;
  lng: number;
  avgMonthlyPurchase: number;
  classification: ClientClassification;
  totalBagsAccumulated: number;
}

export interface Order {
  id: string;
  clientId: string;
  productType: ProductType;
  quantity: number;
  paymentMethod?: PaymentMethod;
  status: OrderStatus;
  workerId?: string;
  signature?: string;
  photoUrl?: string;
  timestamp: number;
  deliveryTime?: number;
  durationMinutes?: number;
  amount: number;
  unitPrice: number; // Precio aplicado en el momento de la venta
}

export interface InventoryLog {
  id: string;
  date: string;
  quantity: number;
  type: 'PRODUCTION' | 'WASTE' | 'SALE'; // SALE es automático
  reason?: string;
}

export interface PriceConfig {
  general: {
    [ProductType.ICE]: number;
    [ProductType.WATER]: number;
  };
  specialPrices: {
    [clientId: string]: {
      [ProductType.ICE]?: number;
      [ProductType.WATER]?: number;
    };
  };
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  currentRouteId?: string;
}

export const DEFAULT_PRICES = {
  [ProductType.ICE]: 26, // MXN
  [ProductType.WATER]: 35 // MXN
};
