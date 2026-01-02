import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { ApiResponse, AuthResponse, ApiSuccessResponse } from '@/types';

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: env.API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper to extract error message from API response
const getErrorMessage = (error: AxiosError<ApiResponse>): string => {
  // Try to get message from response body
  const responseData = error.response?.data;
  if (responseData) {
    // Check if it's an error response
    if (responseData.success === false && responseData.error?.message) {
      return responseData.error.message;
    }
    // Check if there's a message in success response (shouldn't happen for errors, but just in case)
    if (responseData.success === true && responseData.message) {
      return responseData.message;
    }
  }
  // Fallback to status text or generic message
  return error.response?.statusText || error.message || 'An error occurred';
};

// Response interceptor - handle errors with auto refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 - Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip refresh for login/register/refresh endpoints - throw error with proper message
      if (originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/register') ||
          originalRequest.url?.includes('/auth/refresh')) {
        const message = getErrorMessage(error);
        return Promise.reject(new Error(message));
      }

      if (isRefreshing) {
        // Wait for the refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== 'undefined'
        ? localStorage.getItem('refreshToken')
        : null;

      if (!refreshToken) {
        // No refresh token, redirect to login
        isRefreshing = false;
        processQueue(new Error('No refresh token'), null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          document.cookie = 'accessToken=; path=/; max-age=0';
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        // Call refresh endpoint
        const response = await axios.post<ApiSuccessResponse<AuthResponse>>(
          `${env.API_URL}/auth/refresh`,
          { refreshToken }
        );

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

        // Store new tokens
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
          document.cookie = `accessToken=${newAccessToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        }

        // Update authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        processQueue(refreshError as Error, null);
        isRefreshing = false;

        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          document.cookie = 'accessToken=; path=/; max-age=0';
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // For all other errors, extract proper error message
    const message = getErrorMessage(error);
    return Promise.reject(new Error(message));
  }
);

export { apiClient };

// Helper function for API calls
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: unknown,
  params?: Record<string, unknown>
): Promise<T> {
  const response = await apiClient.request<ApiResponse<T>>({
    method,
    url,
    data,
    params,
  });

  if (response.data.success) {
    return response.data.data;
  }

  throw new Error(response.data.error?.message || 'API Error');
}
