import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import { tokenManager } from '../lib/tokenManager';

// Flag to prevent multiple refresh calls during initialization
let isRefreshingInProgress = false;
let refreshPromise: Promise<void> | null = null;

export const useAuthInit = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('[Auth Init] Starting authentication initialization...');

        // If refresh is already in progress, wait for it to complete
        if (isRefreshingInProgress) {
          console.log('[Auth Init] Refresh already in progress, waiting...');
          if (refreshPromise) {
            await refreshPromise;
          }
          setIsInitialized(true);
          return;
        }

        // Try to refresh the access token
        // If there's a refresh_token in HttpOnly cookie, backend will use it
        // If not, we'll get a 401 and treat user as not logged in
        console.log(
          '[Auth Init] Attempting to refresh access token from cookie...'
        );

        // Create refresh promise
        const refreshAsync = async () => {
          try {
            isRefreshingInProgress = true;

            const response = await axios.post(
              `${API_URL}/auth/refresh`,
              {},
              { withCredentials: true } // Enable credentials to send refresh token cookie
            );

            console.log(
              '[Auth Init] Refresh successful, setting new access token'
            );
            const { access_token, user } = response.data;
            tokenManager.setAccessToken(access_token);

            // Store user info in localStorage
            if (user) {
              localStorage.setItem('user', JSON.stringify(user));
              console.log('[Auth Init] Stored user info with role:', user.role);
            }

            // Also get user info from token
            const userFromToken = tokenManager.getUserInfo();
            if (userFromToken) {
              console.log(
                '[Auth Init] User role from token:',
                userFromToken.role
              );
            }

            console.log(
              '[Auth Init] Authentication initialized successfully ✓'
            );
          } catch (refreshErr: any) {
            // If refresh fails with 401, it means no valid refresh token
            if (refreshErr.response?.status === 401) {
              console.log(
                '[Auth Init] No valid refresh token (401), user not logged in'
              );
              // Clear any stale tokens
              tokenManager.clearTokens();
              localStorage.removeItem('user');
            } else {
              // Other errors - still proceed but user is logged out
              const errorMsg =
                refreshErr instanceof Error
                  ? refreshErr.message
                  : 'Unknown error';
              console.error('[Auth Init] Refresh token error:', errorMsg);
              setError(errorMsg);
              tokenManager.clearTokens();
              localStorage.removeItem('user');
            }
          } finally {
            isRefreshingInProgress = false;
            refreshPromise = null;
          }
        };

        refreshPromise = refreshAsync();
        await refreshPromise;
      } finally {
        setIsInitialized(true);
      }
    };

    initAuth();
  }, []);

  return { isInitialized, error };
};
