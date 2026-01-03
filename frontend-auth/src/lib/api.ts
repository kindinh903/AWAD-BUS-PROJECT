import axios from 'axios';
import { API_URL } from '../config/constants';
import { tokenManager } from './tokenManager';
import type {
  CreateSeatMapInput,
  UpdateSeatMapInput,
  BulkUpdateSeatsInput,
  RegenerateSeatLayoutInput,
  AssignSeatMapToBusInput,
} from '../types/seatMap';
import type { Passenger } from '../types/booking';

// Event emitter for auth events
export const authEvents = {
  listeners: [] as ((event: { type: string; data?: any }) => void)[],

  on(callback: (event: { type: string; data?: any }) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },

  emit(type: string, data?: any) {
    this.listeners.forEach(callback => callback({ type, data }));
  },
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable credentials to send cookies with requests
});

// Request interceptor to add auth token
api.interceptors.request.use(
  config => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // If 401 and not already retrying, try to refresh token
    // Only refresh if we actually have a token (not login/register failures)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const hasToken = tokenManager.getAccessToken();

      // Don't retry if:
      // 1. This is already a refresh request
      // 2. No token exists (means login/register failed, not token expired)
      if (originalRequest.url?.includes('/auth/refresh') || !hasToken) {
        return Promise.reject(error);
      }

      try {
        // Refresh token is in HttpOnly cookie, just call the endpoint without body
        console.log('[API] Token expired, attempting refresh...');
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true } // Enable credentials to send refresh token cookie
        );

        console.log('[API] Token refreshed successfully');
        const { access_token } = response.data;
        tokenManager.setAccessToken(access_token);
        // Refresh token is set as HttpOnly cookie by backend automatically

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Clear tokens and emit logout event
        console.log('[API] Token refresh failed, logging out');
        tokenManager.clearTokens();
        localStorage.removeItem('user');
        authEvents.emit('logout');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: {
    email: string;
    password: string;
    name: string;
    phone: string;
  }) => api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  refreshToken: () => api.post('/auth/refresh', {}),
  logout: () => api.post('/auth/logout', {}),
  googleAuth: (idToken: string) =>
    api.post('/auth/google/callback', { id_token: idToken }),
};

// Trip Search API
export interface TripSearchParams {
  origin: string;
  destination: string;
  date: string;
  bus_type?: string;
  status?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: 'price' | 'time' | 'duration' | 'departure';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export const tripAPI = {
  search: (params: TripSearchParams) =>
    api.get('/trips/search', { params }),
  getSeats: (tripId: string) =>
    api.get(`/trips/${tripId}/seats`),
  getSeatsWithStatus: (tripId: string) =>
    api.get(`/trips/${tripId}/seats/status`),
  getAvailableSeats: (tripId: string) =>
    api.get(`/trips/${tripId}/seats`),
  getById: (tripId: string) =>
    api.get(`/trips/${tripId}`),
  getRelatedTrips: (tripId: string, limit?: number) =>
    api.get(`/trips/${tripId}/related`, { params: { limit } }),
};

// Review API
export interface CreateReviewData {
  booking_id: string;
  rating: number;
  title?: string;
  comment?: string;
}

export interface UpdateReviewData {
  rating?: number;
  title?: string;
  comment?: string;
}

export const reviewAPI = {
  // Get reviews for a trip (paginated)
  getTripReviews: (tripId: string, page = 1, pageSize = 10) =>
    api.get(`/trips/${tripId}/reviews`, { params: { page, page_size: pageSize } }),

  // Create a review for a trip (authenticated)
  createReview: (tripId: string, data: CreateReviewData) =>
    api.post(`/trips/${tripId}/reviews`, data),

  // Get current user's reviews
  getMyReviews: () =>
    api.get('/reviews/my-reviews'),

  // Update a review
  updateReview: (reviewId: string, data: UpdateReviewData) =>
    api.put(`/reviews/${reviewId}`, data),

  // Delete a review
  deleteReview: (reviewId: string) =>
    api.delete(`/reviews/${reviewId}`),
};

// Admin API
export const adminAPI = {
  // Buses
  getAllBuses: () => api.get('/admin/buses'),
  createBus: (data: {
    name: string;
    plateNumber: string;
    totalSeats: number;
    busType: string;
    manufacturer?: string;
    model?: string;
    year?: number;
  }) => api.post('/admin/buses', data),
  updateBus: (busId: string, data: {
    name?: string;
    plateNumber?: string;
    totalSeats?: number;
    busType?: string;
    manufacturer?: string;
    model?: string;
    year?: number;
    status?: string;
  }) => api.put(`/admin/buses/${busId}`, data),
  deleteBus: (busId: string) => api.delete(`/admin/buses/${busId}`),
  getAvailableBuses: (routeId: string, start: string, end: string) =>
    api.get('/admin/buses/available', { params: { routeId, start, end } }),

  // Routes
  getAllRoutes: () => api.get('/admin/routes'),
  createRoute: (data: {
    origin: string;
    destination: string;
    durationMinutes: number;
    distance?: number;
    basePrice: number;
    description?: string;
  }) => api.post('/admin/routes', data),
  updateRoute: (routeId: string, data: {
    origin?: string;
    destination?: string;
    durationMinutes?: number;
    distance?: number;
    basePrice?: number;
    description?: string;
    isActive?: boolean;
  }) => api.put(`/admin/routes/${routeId}`, data),
  deleteRoute: (routeId: string) => api.delete(`/admin/routes/${routeId}`),

  // Trips
  getAllTrips: () => api.get('/admin/trips'),
  assignBus: (tripId: string, busId: string) =>
    api.post('/admin/trips/assign-bus', { tripId, busId }),
  updateTripStatus: (tripId: string, status: string) =>
    api.put(`/admin/trips/${tripId}/status`, { status }),

  // Trip Operations - Create
  createTrip: (data: {
    routeId: string;
    busId?: string;
    startTime: string;
    endTime: string;
    price: number;
    driverId?: string;
    notes?: string;
  }) => api.post('/admin/trips', data),

  // Trip Operations - Passengers
  getTripPassengers: (tripId: string) =>
    api.get(`/admin/trips/${tripId}/passengers`),
  checkInPassenger: (tripId: string, passengerId: string) =>
    api.post(`/admin/trips/${tripId}/passengers/${passengerId}/check-in`),

  // Analytics
  getDashboardSummary: () => api.get('/admin/analytics/dashboard'),
  getBookingTrends: (startDate: string, endDate: string) =>
    api.get('/admin/analytics/bookings/trends', { params: { start_date: startDate, end_date: endDate } }),
  getRevenueSummary: (startDate: string, endDate: string) =>
    api.get('/admin/analytics/revenue', { params: { start_date: startDate, end_date: endDate } }),
  getPopularRoutes: (startDate: string, endDate: string, limit = 5) =>
    api.get('/admin/analytics/routes/popular', { params: { start_date: startDate, end_date: endDate, limit } }),
  getConversionRate: (startDate: string, endDate: string) =>
    api.get('/admin/analytics/conversion-rate', { params: { start_date: startDate, end_date: endDate } }),

  // User Management
  listAdmins: (params?: { role?: string }) => api.get('/admin/users', { params }),
  getUser: (userId: string) => api.get(`/admin/users/${userId}`),
  createAdmin: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post('/admin/users', data),
  updateUser: (userId: string, data: { name?: string; phone?: string; is_active?: boolean; role?: string }) =>
    api.put(`/admin/users/${userId}`, data),
  deactivateUser: (userId: string) => api.delete(`/admin/users/${userId}`),
};

// Seat Map API
export const seatMapAPI = {
  // Get all seat maps
  getAll: () => api.get('/admin/seat-maps'),

  // Get seat type configurations
  getConfigs: () => api.get('/admin/seat-maps/configs'),

  // Get a specific seat map with seats
  getById: (id: string) => api.get(`/admin/seat-maps/${id}`),

  // Create a new seat map
  create: (data: CreateSeatMapInput) => api.post('/admin/seat-maps', data),

  // Update a seat map
  update: (id: string, data: UpdateSeatMapInput) =>
    api.put(`/admin/seat-maps/${id}`, data),

  // Delete a seat map
  delete: (id: string) => api.delete(`/admin/seat-maps/${id}`),

  // Bulk update seats
  bulkUpdateSeats: (id: string, data: BulkUpdateSeatsInput) =>
    api.put(`/admin/seat-maps/${id}/seats`, data),

  // Regenerate seat layout
  regenerateLayout: (id: string, data: RegenerateSeatLayoutInput) =>
    api.post(`/admin/seat-maps/${id}/regenerate`, data),

  // Assign seat map to bus
  assignToBus: (data: AssignSeatMapToBusInput) =>
    api.post('/admin/buses/assign-seat-map', data),
};

// Booking API
export const bookingAPI = {
  // Reserve seats temporarily
  reserveSeats: (tripId: string, seatIds: string[], sessionId: string) =>
    api.post('/bookings/reserve', { trip_id: tripId, seat_ids: seatIds, session_id: sessionId }),

  // Release seat reservations
  releaseSeats: (sessionId: string) =>
    api.delete('/bookings/release', { params: { session_id: sessionId } }),

  // Create booking
  createBooking: (data: {
    trip_id: string;
    user_id?: string | null;  // Add user_id support
    contact_email: string;
    contact_phone: string;
    contact_name: string;
    passengers: Passenger[];
    session_id: string;
  }) => api.post('/bookings', data),

  // Confirm booking after payment
  confirmBooking: (bookingId: string, paymentMethod: string, paymentReference?: string) =>
    api.post(`/bookings/${bookingId}/confirm`, { payment_method: paymentMethod, payment_reference: paymentReference }),

  // Cancel booking
  cancelBooking: (bookingId: string, reason?: string) =>
    api.post(`/bookings/${bookingId}/cancel`, { reason }),

  // Get booking by reference
  getByReference: (reference: string) =>
    api.get(`/bookings/ref/${reference}`),

  // Get user's booking history (authenticated)
  getMyBookings: (page = 1, pageSize = 10) =>
    api.get('/bookings/my-bookings', { params: { page, page_size: pageSize } }),

  // Get guest bookings
  getGuestBookings: (email?: string, phone?: string) =>
    api.get('/bookings/guest', { params: { email, phone } }),

  // Get available seats for a trip (only unbooked seats)
  getAvailableSeats: (tripId: string) =>
    api.get(`/trips/${tripId}/seats`),

  // Get all seats with status (available, booked, reserved)
  getSeatsWithStatus: (tripId: string) =>
    api.get(`/trips/${tripId}/seats/status`),

  // Download ticket PDF
  downloadTicket: (ticketId: string) => {
    const url = `${API_URL}/tickets/${ticketId}/download`;
    window.open(url, '_blank');
  },

  // Download all tickets for a booking
  downloadBookingTickets: (bookingId: string) => {
    const url = `${API_URL}/bookings/${bookingId}/tickets/download`;
    window.open(url, '_blank');
  },

  // Resend ticket emails
  resendTickets: (bookingId: string) =>
    api.post(`/bookings/${bookingId}/resend-tickets`),
};

// Payment API
export const paymentAPI = {
  // Create a payment for a booking
  createPayment: (bookingId: string, returnUrl?: string, cancelUrl?: string) =>
    api.post('/payments', { booking_id: bookingId, return_url: returnUrl, cancel_url: cancelUrl }),

  // Get payment by ID
  getPayment: (paymentId: string) =>
    api.get(`/payments/${paymentId}`),

  // Get payment status (for polling)
  getPaymentStatus: (paymentId: string) =>
    api.get(`/payments/${paymentId}/status`),

  // Get all payments for a booking
  getBookingPayments: (bookingId: string) =>
    api.get(`/bookings/${bookingId}/payments`),
};

// Analytics API (Admin only)
export const analyticsAPI = {
  // Get dashboard summary
  getDashboard: () => api.get('/admin/analytics/dashboard'),

  // Get booking trends over time
  getBookingTrends: (startDate: string, endDate: string) =>
    api.get('/admin/analytics/bookings/trends', { params: { start_date: startDate, end_date: endDate } }),

  // Get revenue summary
  getRevenue: (startDate: string, endDate: string) =>
    api.get('/admin/analytics/revenue', { params: { start_date: startDate, end_date: endDate } }),

  // Get revenue by time of day
  getRevenueByTimeOfDay: (startDate: string, endDate: string) =>
    api.get('/admin/analytics/revenue/time-of-day', { params: { start_date: startDate, end_date: endDate } }),

  // Get conversion rate
  getConversionRate: (startDate: string, endDate: string) =>
    api.get('/admin/analytics/conversion-rate', { params: { start_date: startDate, end_date: endDate } }),

  // Get popular routes
  getPopularRoutes: (limit?: number, orderBy?: string) =>
    api.get('/admin/analytics/routes/popular', { params: { limit, order_by: orderBy } }),

  // Get route performance
  getRoutePerformance: (routeId: string, startDate: string, endDate: string) =>
    api.get(`/admin/analytics/routes/${routeId}/performance`, { params: { start_date: startDate, end_date: endDate } }),

  // Compare periods
  comparePeriods: (currentStart: string, currentEnd: string, previousStart: string, previousEnd: string) =>
    api.get('/admin/analytics/compare', {
      params: {
        current_start: currentStart,
        current_end: currentEnd,
        previous_start: previousStart,
        previous_end: previousEnd
      }
    }),
};

// Notification API
export const notificationAPI = {
  // Get user notifications
  getNotifications: (limit = 20) =>
    api.get('/notifications', { params: { limit } }),

  // Get unread count
  getUnreadCount: () =>
    api.get('/notifications/unread-count'),

  // Mark notification as read
  markAsRead: (id: string) =>
    api.put(`/notifications/${id}/read`),

  // Mark all as read
  markAllAsRead: () =>
    api.put('/notifications/mark-all-read'),

  // Delete notification
  deleteNotification: (id: string) =>
    api.delete(`/notifications/${id}`),

  // Create test notifications (development only)
  createTestNotifications: () =>
    api.post('/notifications/test'),
};

export default api;