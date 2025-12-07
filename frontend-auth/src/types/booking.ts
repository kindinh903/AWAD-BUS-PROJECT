export interface Seat {
  id: string;
  seat_map_id: string;
  seat_number: string;
  row: number;
  column: number;
  seat_type: 'standard' | 'vip' | 'sleeper' | 'aisle' | 'unavailable';
  position: 'left' | 'middle' | 'right' | 'aisle';
  price_multiplier: number;
  is_bookable: boolean;
  label?: string;
}

export interface SeatStatus {
  seat_id: string;
  status: 'available' | 'selected' | 'booked' | 'reserved';
}

export interface Booking {
  id: string;
  booking_reference: string;
  trip_id: string;
  user_id?: string;
  contact_email: string;
  contact_phone: string;
  contact_name: string;
  total_seats: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'expired';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: string;
  payment_reference?: string;
  is_guest_booking: boolean;
  notes?: string;
  expires_at?: string;
  confirmed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Passenger {
  id?: string;
  seat_id: string;
  full_name: string;
  id_number?: string;
  phone?: string;
  email?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  special_needs?: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  booking_id: string;
  passenger_id: string;
  trip_id: string;
  seat_number: string;
  passenger_name: string;
  qr_code?: string;
  barcode?: string;
  is_used: boolean;
  used_at?: string;
  created_at: string;
}

export interface BookingResponse {
  booking: Booking;
  passengers: Passenger[];
  tickets: Ticket[];
}
