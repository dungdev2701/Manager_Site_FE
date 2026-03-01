import { apiClient } from './client';
import { ApiSuccessResponse, SystemConfig } from '@/types';

export const systemConfigApi = {
  getAll: async (): Promise<SystemConfig[]> => {
    const response = await apiClient.get<ApiSuccessResponse<SystemConfig[]>>(
      '/system-config/list'
    );
    return response.data.data;
  },

  update: async (key: string, value: string, description?: string): Promise<SystemConfig> => {
    const response = await apiClient.put<ApiSuccessResponse<SystemConfig>>(
      `/system-config/${key}`,
      { value, description }
    );
    return response.data.data;
  },

  resetOne: async (key: string): Promise<SystemConfig> => {
    const response = await apiClient.post<ApiSuccessResponse<SystemConfig>>(
      `/system-config/${key}/reset`
    );
    return response.data.data;
  },

  resetAll: async (): Promise<{ reset: number }> => {
    const response = await apiClient.post<ApiSuccessResponse<{ reset: number }>>(
      '/system-config/reset-all'
    );
    return response.data.data;
  },
};
