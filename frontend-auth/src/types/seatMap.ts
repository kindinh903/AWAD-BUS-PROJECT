// Seat Map Types for Bus Booking System

export type SeatType = 'standard' | 'vip' | 'sleeper' | 'aisle' | 'unavailable';
export type SeatPosition = 'left' | 'middle' | 'right' | 'aisle';

export interface Seat {
  id: string;
  seat_map_id: string;
  seat_number: string;
  row: number;
  column: number;
  seat_type: SeatType;
  position: SeatPosition;
  price_multiplier: number;
  is_bookable: boolean;
  label?: string;
  created_at: string;
  updated_at: string;
}

export interface SeatMap {
  id: string;
  name: string;
  description?: string;
  rows: number;
  columns: number;
  total_seats: number;
  bus_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  seats?: Seat[];
}

export interface SeatTypeConfig {
  type: SeatType;
  name: string;
  color: string;
  price_multiplier: number;
  is_bookable: boolean;
}

export interface CreateSeatMapInput {
  name: string;
  description?: string;
  rows: number;
  columns: number;
  bus_type: string;
}

export interface UpdateSeatMapInput {
  name?: string;
  description?: string;
  bus_type?: string;
  is_active?: boolean;
}

export interface SeatUpdateItem {
  id: string;
  seat_type?: SeatType;
  price_multiplier?: number;
  is_bookable?: boolean;
}

export interface BulkUpdateSeatsInput {
  seats: SeatUpdateItem[];
}

export interface RegenerateSeatLayoutInput {
  rows: number;
  columns: number;
}

export interface AssignSeatMapToBusInput {
  bus_id: string;
  seat_map_id: string;
}

// API Response types
export interface SeatMapResponse {
  success: boolean;
  data: SeatMap;
}

export interface SeatMapsListResponse {
  success: boolean;
  data: SeatMap[];
  count: number;
}

export interface SeatTypeConfigsResponse {
  success: boolean;
  data: SeatTypeConfig[];
}

// Default seat type configurations for UI
export const DEFAULT_SEAT_TYPE_CONFIGS: SeatTypeConfig[] = [
  { type: 'standard', name: 'Standard', color: '#3B82F6', price_multiplier: 1.0, is_bookable: true },
  { type: 'vip', name: 'VIP', color: '#F59E0B', price_multiplier: 1.5, is_bookable: true },
  { type: 'sleeper', name: 'Sleeper', color: '#8B5CF6', price_multiplier: 2.0, is_bookable: true },
  { type: 'aisle', name: 'Aisle', color: '#E5E7EB', price_multiplier: 0, is_bookable: false },
  { type: 'unavailable', name: 'Unavailable', color: '#EF4444', price_multiplier: 0, is_bookable: false },
];

// Helper function to get seat type config
export const getSeatTypeConfig = (type: SeatType): SeatTypeConfig => {
  return DEFAULT_SEAT_TYPE_CONFIGS.find(c => c.type === type) || DEFAULT_SEAT_TYPE_CONFIGS[0];
};

// Helper function to generate seat label
export const generateSeatLabel = (row: number, column: number): string => {
  const letter = String.fromCharCode(65 + column); // A, B, C, D...
  return `${row}${letter}`;
};
