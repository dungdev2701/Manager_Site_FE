import { apiClient } from './client';
import {
  Proxy,
  ProxyQuery,
  CreateProxyRequest,
  UpdateProxyRequest,
  BulkCreateProxyRequest,
  ApiSuccessResponse,
  PaginationMeta,
} from '@/types';

export interface ProxyListResponse {
  proxies: Proxy[];
  meta: PaginationMeta;
}

interface ProxyApiResponse {
  data: Proxy[];
  pagination: PaginationMeta;
}

interface BulkCreateResponse {
  created: number;
  duplicates: number;
  errors: string[];
}

export interface CheckProgress {
  isRunning: boolean;
  total: number;
  checked: number;
  active: number;
  dead: number;
  startedAt: string | null;
}

interface CheckStartResponse {
  total: number;
  message: string;
}

export const proxyApi = {
  getAll: async (query?: ProxyQuery): Promise<ProxyListResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<ProxyApiResponse>>(
      '/proxies/list',
      {
        params: query,
      }
    );
    return {
      proxies: response.data.data.data,
      meta: response.data.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  },

  getById: async (id: string): Promise<Proxy> => {
    const response = await apiClient.get<ApiSuccessResponse<Proxy>>(`/proxies/detail/${id}`);
    return response.data.data;
  },

  create: async (data: CreateProxyRequest): Promise<Proxy> => {
    const response = await apiClient.post<ApiSuccessResponse<Proxy>>('/proxies/create', data);
    return response.data.data;
  },

  bulkCreate: async (data: BulkCreateProxyRequest): Promise<BulkCreateResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<BulkCreateResponse>>(
      '/proxies/bulk-create',
      data
    );
    return response.data.data;
  },

  update: async (id: string, data: UpdateProxyRequest): Promise<Proxy> => {
    const response = await apiClient.put<ApiSuccessResponse<Proxy>>(
      `/proxies/update/${id}`,
      data
    );
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/proxies/delete/${id}`);
  },

  bulkDelete: async (ids: string[]): Promise<{ deleted: number }> => {
    const response = await apiClient.post<ApiSuccessResponse<{ deleted: number }>>(
      '/proxies/bulk-delete',
      { ids }
    );
    return response.data.data;
  },

  // Check single proxy
  checkProxy: async (id: string): Promise<Proxy> => {
    const response = await apiClient.post<ApiSuccessResponse<Proxy>>(`/proxies/check/${id}`);
    return response.data.data;
  },

  // Check all proxies
  checkAllProxies: async (): Promise<CheckStartResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<CheckStartResponse>>(
      '/proxies/check-all'
    );
    return response.data.data;
  },

  // Check selected proxies
  checkSelectedProxies: async (ids: string[]): Promise<CheckStartResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<CheckStartResponse>>(
      '/proxies/check-selected',
      { ids }
    );
    return response.data.data;
  },

  // Get check progress
  getCheckStatus: async (): Promise<CheckProgress> => {
    const response = await apiClient.get<ApiSuccessResponse<CheckProgress>>(
      '/proxies/check-status'
    );
    return response.data.data;
  },

  // Stop ongoing check
  stopCheck: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<ApiSuccessResponse<{ message: string }>>(
      '/proxies/check-stop'
    );
    return response.data.data;
  },
};
