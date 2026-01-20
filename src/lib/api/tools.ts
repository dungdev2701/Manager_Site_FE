import { apiClient } from './client';
import {
  Tool,
  ToolQuery,
  CreateToolRequest,
  UpdateToolRequest,
  ApiSuccessResponse,
  PaginationMeta,
} from '@/types';

export interface ToolListResponse {
  tools: Tool[];
  meta: PaginationMeta;
}

interface ToolApiResponse {
  data: Tool[];
  pagination: PaginationMeta;
}

export const toolApi = {
  getAll: async (query?: ToolQuery): Promise<ToolListResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<ToolApiResponse>>(
      '/tools/list',
      {
        params: query,
      }
    );
    return {
      tools: response.data.data.data,
      meta: response.data.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  },

  getById: async (id: string): Promise<Tool> => {
    const response = await apiClient.get<ApiSuccessResponse<Tool>>(`/tools/detail/${id}`);
    return response.data.data;
  },

  create: async (data: CreateToolRequest): Promise<Tool> => {
    const response = await apiClient.post<ApiSuccessResponse<Tool>>('/tools/create', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateToolRequest): Promise<Tool> => {
    const response = await apiClient.put<ApiSuccessResponse<Tool>>(
      `/tools/update/${id}`,
      data
    );
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tools/delete/${id}`);
  },

  // Restore tool from trash
  restore: async (id: string): Promise<Tool> => {
    const response = await apiClient.post<ApiSuccessResponse<Tool>>(`/tools/restore/${id}`);
    return response.data.data;
  },

  // Permanently delete tool
  permanentDelete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tools/permanent/${id}`);
  },
};
