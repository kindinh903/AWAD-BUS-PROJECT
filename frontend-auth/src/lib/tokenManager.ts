import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

// Store access token in memory variable
let accessToken: string | null = null;

interface JWTPayload {
  user_id: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

export const tokenManager = {
  /**
   * Set tokens - access token in memory, refresh token in httpOnly cookie
   * Note: Refresh token should be set by server in the response headers
   * as HttpOnly cookie, so browser cannot access it from JavaScript
   */
  setTokens: (newAccessToken: string) => {
    // Store access token in memory variable
    accessToken = newAccessToken;

    // Do NOT set refresh token from JS when using HttpOnly
    // The server should set it in the response headers as:
    // Set-Cookie: refresh_token=xxx; HttpOnly; Path=/; Max-Age=604800;
    // This ensures the browser automatically sends it with requests
  },

  /**
   * Get access token from memory
   */
  getAccessToken: (): string | null => {
    return accessToken;
  },

  /**
   * Get refresh token from cookie
   * Note: This should only be called by the server via HTTP requests
   * The refresh token cookie is HttpOnly and sent automatically by the browser
   */
  getRefreshToken: (): string | undefined => {
    // This will return undefined if HttpOnly is properly set
    // because JS cannot access HttpOnly cookies
    // The server receives it automatically in the request cookies
    return Cookies.get('refresh_token');
  },

  /**
   * Clear all tokens
   */
  clearTokens: () => {
    accessToken = null;
    Cookies.remove('refresh_token', { path: '/' });
  },

  /**
   * Update access token (useful for token refresh)
   */
  setAccessToken: (token: string) => {
    accessToken = token;
  },

  /**
   * Get user role from access token
   */
  getUserRole: (): string | null => {
    if (!accessToken) return null;
    
    try {
      const decoded = jwtDecode<JWTPayload>(accessToken);
      return decoded.role;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },

  /**
   * Get user info from access token
   */
  getUserInfo: (): { userId: string; email: string; role: string } | null => {
    if (!accessToken) return null;
    
    try {
      const decoded = jwtDecode<JWTPayload>(accessToken);
      return {
        userId: decoded.user_id,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },

  /**
   * Check if token is expired
   */
  isTokenExpired: (): boolean => {
    if (!accessToken) return true;
    
    try {
      const decoded = jwtDecode<JWTPayload>(accessToken);
      return decoded.exp * 1000 < Date.now();
    } catch (error) {
      return true;
    }
  },
};
