
import { Client, ClientClassification, User, UserRole } from './types';

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1',
    name: 'Restaurante El Muelle',
    phone: '9841234567',
    business: 'Restaurante',
    lat: 21.524,
    lng: -87.378,
    avgMonthlyPurchase: 450,
    classification: ClientClassification.GOOD,
    totalBagsAccumulated: 1250
  },
  {
    id: 'c2',
    name: 'Hotel Punta Caliza',
    phone: '9848765432',
    business: 'Hotel',
    lat: 21.530,
    lng: -87.370,
    avgMonthlyPurchase: 800,
    classification: ClientClassification.GOOD,
    totalBagsAccumulated: 1480
  },
  {
    id: 'c3',
    name: 'Tienda La Esquina',
    phone: '9845554444',
    business: 'Mini Super',
    lat: 21.521,
    lng: -87.382,
    avgMonthlyPurchase: 120,
    classification: ClientClassification.REGULAR,
    totalBagsAccumulated: 400
  },
  {
    id: 'c4',
    name: 'Bar Los Compas',
    phone: '9843332222',
    business: 'Bar',
    lat: 21.528,
    lng: -87.375,
    avgMonthlyPurchase: 300,
    classification: ClientClassification.BAD,
    totalBagsAccumulated: 2200
  }
];

export const MOCK_WORKERS: User[] = [
  { id: 'w1', name: 'Juan Pérez', role: UserRole.WORKER },
  { id: 'w2', name: 'Pedro Gómez', role: UserRole.WORKER },
  { id: 'w3', name: 'Carlos Ruiz', role: UserRole.WORKER },
  { id: 'w4', name: 'Luis Marín', role: UserRole.WORKER }
];

export const MAP_CENTER = { lat: 21.526, lng: -87.376 }; // Central Holbox
