import axios from 'axios';
import { API_URL } from '../config/constants';
import { tokenManager } from './tokenManager';

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
      config.headers.Authorization =
       `Bearer ${token}`
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
  googleAuth: (idToken: string) => api.post('/auth/google/callback', { id_token: idToken }),
};

export default api;
