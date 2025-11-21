import axios from 'axios'
import { API_URL } from '../config/constants'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })

        const { access_token } = response.data
        localStorage.setItem('access_token', access_token)

        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        // Clear tokens and redirect to login
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// API Types
export interface Bus {
  id: string
  license_plate: string
  bus_type: string
  manufacturer: string
  model: string
  year: number
  operator_name: string
  seat_layout: {
    rows: number
    columns: number
    total_seats: number
    floors: number
    layout: string[][]
  }
  amenities: string[]
  status: string
  last_maintenance?: string
  created_at: string
  updated_at: string
}

export interface Route {
  id: string
  name: string
  from_city: string
  to_city: string
  distance: number
  base_price: number
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Trip {
  id: string
  bus_id: string
  route_id: string
  departure_time: string
  arrival_time: string
  duration: number
  price: number
  status: string
  driver_name: string
  driver_phone: string
  bus?: Bus
  route?: Route
  created_at: string
  updated_at: string
}

export interface Seat {
  id: string
  trip_id: string
  seat_number: string
  status: string
  locked_until?: string
  locked_by?: string
  booking_id?: string
}

export interface Booking {
  id: string
  trip_id: string
  user_id?: string
  seats: string[]
  total_price: number
  status: string
  booking_code: string
  contact_name: string
  contact_email: string
  contact_phone: string
  expires_at?: string
  cancelled_at?: string
  created_at: string
  updated_at: string
  trip?: Trip
}

// API Methods

// Auth
export const authAPI = {
  register: (data: { email: string; password: string; name: string; phone: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  refreshToken: (refresh_token: string) => api.post('/auth/refresh', { refresh_token }),
}

// Trips
export const tripsAPI = {
  search: (params: { from_city: string; to_city: string; date: string; page?: number; limit?: number }) =>
    api.get<{ trips: Trip[] }>('/trips', { params }),
  getById: (id: string) => api.get<Trip>(`/trips/${id}`),
  getSeats: (id: string) => api.get<{ seats: Seat[] }>(`/trips/${id}/seats`),
}

// Bookings
export const bookingsAPI = {
  initiate: (data: {
    trip_id: string
    seat_numbers: string[]
    contact_name: string
    contact_email: string
    contact_phone: string
  }) => api.post<Booking>('/bookings', data),
  getById: (id: string) => api.get<Booking>(`/bookings/${id}`),
  getMyBookings: (params?: { page?: number; limit?: number }) =>
    api.get<Booking[]>('/bookings', { params }),
  cancel: (id: string) => api.post(`/bookings/${id}/cancel`),
}

// Payments
export const paymentsAPI = {
  create: (data: { booking_id: string; gateway: string; idempotency_key?: string }) =>
    api.post('/payments', data),
  getStatus: (id: string) => api.get(`/payments/${id}`),
}

// Admin - Buses
export const adminBusesAPI = {
  create: (data: Partial<Bus>) => api.post<Bus>('/admin/buses', data),
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<{ buses: Bus[] }>('/admin/buses', { params }),
  getById: (id: string) => api.get<Bus>(`/admin/buses/${id}`),
  update: (id: string, data: Partial<Bus>) => api.put<Bus>(`/admin/buses/${id}`, data),
  delete: (id: string) => api.delete(`/admin/buses/${id}`),
}

// Admin - Routes
export const adminRoutesAPI = {
  create: (data: Partial<Route>) => api.post<Route>('/admin/routes', data),
  list: (params?: { page?: number; limit?: number }) =>
    api.get<{ routes: Route[] }>('/admin/routes', { params }),
  getById: (id: string) => api.get<Route>(`/admin/routes/${id}`),
  update: (id: string, data: Partial<Route>) => api.put<Route>(`/admin/routes/${id}`, data),
  delete: (id: string) => api.delete(`/admin/routes/${id}`),
}

// Admin - Trips
export const adminTripsAPI = {
  create: (data: {
    bus_id: string
    route_id: string
    departure_time: string
    arrival_time: string
    price: number
    driver_name?: string
    driver_phone?: string
  }) => api.post<Trip>('/admin/trips', data),
  update: (id: string, data: Partial<Trip>) => api.put<Trip>(`/admin/trips/${id}`, data),
  delete: (id: string) => api.delete(`/admin/trips/${id}`),
}

export default api
