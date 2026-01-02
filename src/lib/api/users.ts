import { apiClient } from './client';
import { ApiSuccessResponse, PaginationMeta, User, Role } from '@/types';

export interface UserQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
  isActive?: boolean;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role?: Role;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: Role;
  isActive?: boolean;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface UserListResponse {
  data: User[];
  pagination: PaginationMeta;
}

export const userApi = {
  getAll: async (query?: UserQuery): Promise<UserListResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<UserListResponse>>(
      '/users/list',
      { params: query }
    );
    return response.data.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get<ApiSuccessResponse<User>>(`/users/${id}`);
    return response.data.data;
  },

  create: async (data: CreateUserRequest): Promise<User> => {
    const response = await apiClient.post<ApiSuccessResponse<User>>('/users/create', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateUserRequest): Promise<User> => {
    const response = await apiClient.put<ApiSuccessResponse<User>>(`/users/update/${id}`, data);
    return response.data.data;
  },

  resetPassword: async (id: string, data: ResetPasswordRequest): Promise<void> => {
    await apiClient.put(`/users/${id}/reset-password`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/delete/${id}`);
  },

  permanentDelete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/permanent/${id}`);
  },

  activate: async (id: string): Promise<User> => {
    const response = await apiClient.post<ApiSuccessResponse<User>>(`/users/${id}/activate`);
    return response.data.data;
  },

  deactivate: async (id: string): Promise<User> => {
    const response = await apiClient.post<ApiSuccessResponse<User>>(`/users/${id}/deactivate`);
    return response.data.data;
  },
};
