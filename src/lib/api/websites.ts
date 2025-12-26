import { apiClient } from './client';
import {
  Website,
  WebsiteQuery,
  CreateWebsiteRequest,
  UpdateWebsiteRequest,
  ApiSuccessResponse,
  PaginationMeta,
  WebsiteMetrics,
  WebsiteStatus,
} from '@/types';

export interface BulkWebsiteItem {
  domain: string;
  metrics?: WebsiteMetrics;
  status?: WebsiteStatus;
}

export interface WebsiteListResponse {
  websites: Website[];
  meta: PaginationMeta;
}

interface WebsiteApiResponse {
  data: Website[];
  pagination: PaginationMeta;
}

export const websiteApi = {
  getAll: async (query?: WebsiteQuery): Promise<WebsiteListResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<WebsiteApiResponse>>(
      '/websites/list',
      {
        params: query,
      }
    );
    return {
      websites: response.data.data.data,
      meta: response.data.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  },

  getById: async (id: string): Promise<Website> => {
    const response = await apiClient.get<ApiSuccessResponse<Website>>(`/websites/${id}`);
    return response.data.data;
  },

  create: async (data: CreateWebsiteRequest): Promise<Website> => {
    const response = await apiClient.post<ApiSuccessResponse<Website>>('/websites/create', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateWebsiteRequest): Promise<Website> => {
    const response = await apiClient.put<ApiSuccessResponse<Website>>(
      `/websites/update/${id}`,
      data
    );
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/websites/delete/${id}`);
  },

  bulkCreate: async (
    domains: string[]
  ): Promise<{ created: number; duplicates: string[]; invalid: string[]; total: number }> => {
    const response = await apiClient.post<
      ApiSuccessResponse<{
        created: number;
        duplicates: string[];
        invalid: string[];
        total: number;
      }>
    >('/websites/create-bulk', {
      domains,
    });
    return response.data.data;
  },

  bulkCreateWithMetrics: async (
    websites: BulkWebsiteItem[]
  ): Promise<{ created: number; duplicates: string[]; invalid: string[]; total: number }> => {
    const response = await apiClient.post<
      ApiSuccessResponse<{
        created: number;
        duplicates: string[];
        invalid: string[];
        total: number;
      }>
    >('/websites/create-bulk-with-metrics', {
      websites,
    });
    return response.data.data;
  },

  bulkDelete: async (ids: string[]): Promise<void> => {
    await apiClient.delete('/websites/bulk', { data: { ids } });
  },

  bulkUpdateStatus: async (ids: string[], status: string): Promise<Website[]> => {
    const response = await apiClient.patch<ApiSuccessResponse<Website[]>>('/websites/bulk/status', {
      ids,
      status,
    });
    return response.data.data;
  },

  // Trash (soft deleted websites)
  getTrash: async (query?: WebsiteQuery): Promise<WebsiteListResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<WebsiteApiResponse>>(
      '/websites/trash',
      {
        params: query,
      }
    );
    return {
      websites: response.data.data.data,
      meta: response.data.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  },

  // Restore website from trash
  restore: async (id: string): Promise<Website> => {
    const response = await apiClient.post<ApiSuccessResponse<Website>>(`/websites/restore/${id}`);
    return response.data.data;
  },

  // Permanently delete website
  permanentDelete: async (id: string): Promise<void> => {
    await apiClient.delete(`/websites/permanent/${id}`);
  },

  // Get all website IDs based on current filters (for Select All)
  getAllIds: async (query?: WebsiteQuery): Promise<{ ids: string[]; total: number }> => {
    const response = await apiClient.get<ApiSuccessResponse<{ ids: string[]; total: number }>>(
      '/websites/all-ids',
      { params: query }
    );
    return response.data.data;
  },

  // Get websites by IDs (for Export)
  getByIds: async (ids: string[]): Promise<{ websites: Website[]; total: number }> => {
    const response = await apiClient.post<ApiSuccessResponse<{ websites: Website[]; total: number }>>(
      '/websites/by-ids',
      { ids }
    );
    return response.data.data;
  },
};
