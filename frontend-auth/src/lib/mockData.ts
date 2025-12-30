// Mock data for dashboard
export type UserRole = 'admin' | 'manager' | 'user';

export interface SummaryCard {
  id: string;
  title: string;
  value: number | string;
  unit?: string;
  change?: number;
  icon: string;
  color: 'blue' | 'green' | 'orange' | 'red';
}

export interface Activity {
  id: string;
  type: 'booking' | 'payment' | 'cancellation' | 'registration';
  description: string;
  user: string;
  timestamp: Date;
  status: 'success' | 'pending' | 'failed';
}

export interface ChartData {
  date: string;
  value: number;
  label?: string;
}

// Admin Dashboard Mock Data
export const adminSummaryCards: SummaryCard[] = [
  {
    id: 'total-bookings',
    title: 'Total Bookings',
    value: 1234,
    change: 12.5,
    icon: '📅',
    color: 'blue',
  },
  {
    id: 'revenue',
    title: 'Revenue',
    value: '1.2B ₫',
    unit: 'VND',
    change: 8.2,
    icon: '💰',
    color: 'green',
  },
  {
    id: 'active-users',
    title: 'Active Users',
    value: 856,
    change: 5.1,
    icon: '👥',
    color: 'orange',
  },
  {
    id: 'system-status',
    title: 'System Status',
    value: 'Healthy',
    icon: '✅',
    color: 'green',
  },
];

// Manager Dashboard Mock Data
export const managerSummaryCards: SummaryCard[] = [
  {
    id: 'trips-today',
    title: 'Trips Today',
    value: 45,
    change: 3.2,
    icon: '🚌',
    color: 'blue',
  },
  {
    id: 'daily-revenue',
    title: 'Daily Revenue',
    value: '65M ₫',
    unit: 'VND',
    change: -2.5,
    icon: '💵',
    color: 'green',
  },
  {
    id: 'occupancy',
    title: 'Occupancy Rate',
    value: '78%',
    change: 4.8,
    icon: '📊',
    color: 'orange',
  },
];

// User Dashboard Mock Data
export const userSummaryCards: SummaryCard[] = [
  {
    id: 'total-bookings',
    title: 'My Bookings',
    value: 12,
    icon: '🎫',
    color: 'blue',
  },
  {
    id: 'upcoming-trips',
    title: 'Upcoming Trips',
    value: 2,
    icon: '🛣️',
    color: 'green',
  },
  {
    id: 'total-spent',
    title: 'Total Spent',
    value: '8.5M ₫',
    unit: 'VND',
    icon: '💳',
    color: 'orange',
  },
];

// Mock Activity Data
export const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'booking',
    description: 'New booking from Ha Noi to Ho Chi Minh',
    user: 'John Doe',
    timestamp: new Date(Date.now() - 5 * 60000),
    status: 'success',
  },
  {
    id: '2',
    type: 'payment',
    description: 'Payment of 250,000₫ received',
    user: 'Jane Smith',
    timestamp: new Date(Date.now() - 15 * 60000),
    status: 'success',
  },
  {
    id: '3',
    type: 'cancellation',
    description: 'Booking cancelled - refund processed',
    user: 'Mike Johnson',
    timestamp: new Date(Date.now() - 30 * 60000),
    status: 'success',
  },
  {
    id: '4',
    type: 'registration',
    description: 'New user registered',
    user: 'Sarah Williams',
    timestamp: new Date(Date.now() - 45 * 60000),
    status: 'success',
  },
  {
    id: '5',
    type: 'booking',
    description: 'Booking attempt failed - payment error',
    user: 'Tom Brown',
    timestamp: new Date(Date.now() - 60 * 60000),
    status: 'failed',
  },
  {
    id: '6',
    type: 'payment',
    description: 'Payment verification pending',
    user: 'Emily Davis',
    timestamp: new Date(Date.now() - 90 * 60000),
    status: 'pending',
  },
];

// Mock Chart Data - Revenue Trend
export const revenueChartData: ChartData[] = [
  { date: 'Jan 01', value: 40000000 },
  { date: 'Jan 02', value: 30000000 },
  { date: 'Jan 03', value: 20000000 },
  { date: 'Jan 04', value: 27800000 },
  { date: 'Jan 05', value: 18900000 },
  { date: 'Jan 06', value: 23900000 },
  { date: 'Jan 07', value: 34900000 },
];

// Mock Chart Data - Booking Status
export const bookingStatusData = [
  { name: 'Completed', value: 400, color: '#10b981' },
  { name: 'Pending', value: 300, color: '#f59e0b' },
  { name: 'Cancelled', value: 200, color: '#ef4444' },
  { name: 'No Show', value: 50, color: '#8b5cf6' },
];

// Mock Chart Data - Trip Performance
export const tripPerformanceData: ChartData[] = [
  { date: 'Mon', value: 45 },
  { date: 'Tue', value: 52 },
  { date: 'Wed', value: 48 },
  { date: 'Thu', value: 61 },
  { date: 'Fri', value: 55 },
  { date: 'Sat', value: 67 },
  { date: 'Sun', value: 42 },
];

// Mock System Status Data
export const systemStatusData = [
  { name: 'API Server', status: 'online' as const, uptime: 99.99 },
  { name: 'Database', status: 'online' as const, uptime: 99.95 },
  { name: 'Cache Server', status: 'online' as const, uptime: 99.87 },
  { name: 'Payment Gateway', status: 'online' as const, uptime: 99.92 },
];

// Bus Trip Mock Data
export interface BusTrip {
  id: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  duration: string;
  price: number;
  busType: 'Standard' | 'VIP' | 'Sleeper';
  company: string;
  availableSeats: number;
  totalSeats: number;
  amenities: string[];
  rating: number;
}

export const mockBusTrips: BusTrip[] = [
  {
    id: '1',
    from: 'Ho Chi Minh',
    to: 'Da Nang',
    departure: '08:00',
    arrival: '20:00',
    duration: '12h 00m',
    price: 450000,
    busType: 'VIP',
    company: 'Phuong Trang',
    availableSeats: 12,
    totalSeats: 45,
    amenities: ['WiFi', 'AC', 'Reclining Seats', 'Snacks'],
    rating: 4.5,
  },
  {
    id: '2',
    from: 'Ho Chi Minh',
    to: 'Da Nang',
    departure: '09:30',
    arrival: '21:30',
    duration: '12h 00m',
    price: 320000,
    busType: 'Standard',
    company: 'Mai Linh Express',
    availableSeats: 8,
    totalSeats: 40,
    amenities: ['AC', 'Reclining Seats'],
    rating: 4.2,
  },
  {
    id: '3',
    from: 'Ho Chi Minh',
    to: 'Da Nang',
    departure: '22:00',
    arrival: '08:00',
    duration: '10h 00m',
    price: 550000,
    busType: 'Sleeper',
    company: 'Sinh Tourist',
    availableSeats: 6,
    totalSeats: 36,
    amenities: ['WiFi', 'AC', 'Sleeper Beds', 'Blanket', 'Water'],
    rating: 4.7,
  },
  {
    id: '4',
    from: 'Hanoi',
    to: 'Hai Phong',
    departure: '07:00',
    arrival: '09:30',
    duration: '2h 30m',
    price: 150000,
    busType: 'Standard',
    company: 'Hoang Long',
    availableSeats: 15,
    totalSeats: 35,
    amenities: ['AC'],
    rating: 4.0,
  },
  {
    id: '5',
    from: 'Hanoi',
    to: 'Hai Phong',
    departure: '14:00',
    arrival: '16:30',
    duration: '2h 30m',
    price: 220000,
    busType: 'VIP',
    company: 'Kumho Samco',
    availableSeats: 20,
    totalSeats: 28,
    amenities: ['WiFi', 'AC', 'Reclining Seats', 'USB Charging'],
    rating: 4.3,
  },
  {
    id: '6',
    from: 'Da Nang',
    to: 'Hue',
    departure: '10:00',
    arrival: '13:00',
    duration: '3h 00m',
    price: 180000,
    busType: 'Standard',
    company: 'ANT Bus',
    availableSeats: 25,
    totalSeats: 40,
    amenities: ['AC', 'Water'],
    rating: 4.1,
  },
  {
    id: '7',
    from: 'Da Nang',
    to: 'Hue',
    departure: '16:00',
    arrival: '19:00',
    duration: '3h 00m',
    price: 250000,
    busType: 'VIP',
    company: 'Phuong Trang',
    availableSeats: 10,
    totalSeats: 30,
    amenities: ['WiFi', 'AC', 'Reclining Seats', 'Snacks'],
    rating: 4.6,
  },
  {
    id: '8',
    from: 'Ho Chi Minh',
    to: 'Nha Trang',
    departure: '23:00',
    arrival: '07:00',
    duration: '8h 00m',
    price: 480000,
    busType: 'Sleeper',
    company: 'Queen Cafe',
    availableSeats: 4,
    totalSeats: 32,
    amenities: ['WiFi', 'AC', 'Sleeper Beds', 'Blanket', 'Water', 'Pillow'],
    rating: 4.8,
  },
];

// Get summary cards based on role
export const getSummaryCardsByRole = (role: UserRole): SummaryCard[] => {
  switch (role) {
    case 'admin':
      return adminSummaryCards;
    case 'manager':
      return managerSummaryCards;
    case 'user':
      return userSummaryCards;
    default:
      return userSummaryCards;
  }
};
