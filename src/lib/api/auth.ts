import { apiClient } from './client';
import { AuthResponse, LoginRequest, RegisterRequest, ApiSuccessResponse, User } from '@/types';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<AuthResponse>>('/auth/login', data);
    return response.data.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<AuthResponse>>('/auth/register', data);
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<ApiSuccessResponse<User>>('/auth/me');
    return response.data.data;
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<AuthResponse>>('/auth/refresh', {
      refreshToken,
    });
    return response.data.data;
  },
};
