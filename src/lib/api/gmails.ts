import { apiClient } from './client';
import {
  Gmail,
  GmailQuery,
  CreateGmailRequest,
  UpdateGmailRequest,
  ApiSuccessResponse,
  PaginationMeta,
} from '@/types';

export interface GmailListResponse {
  gmails: Gmail[];
  meta: PaginationMeta;
}

interface GmailApiResponse {
  data: Gmail[];
  pagination: PaginationMeta;
}

export interface CheckUsageResponse {
  neverUsedCount: number;
  alreadyUsed: Array<{
    id: string;
    email: string;
    usageCount: number;
    users: Array<{
      id: string;
      name: string;
      usedAt: string;
    }>;
  }>;
}

export interface ClaimOwnershipResponse {
  claimed: number;
  newOwnerAssigned: number;
}

export const gmailApi = {
  getAll: async (query?: GmailQuery): Promise<GmailListResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<GmailApiResponse>>(
      '/gmails/list',
      {
        params: query,
      }
    );
    return {
      gmails: response.data.data.data,
      meta: response.data.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  },

  getById: async (id: string): Promise<Gmail> => {
    const response = await apiClient.get<ApiSuccessResponse<Gmail>>(`/gmails/detail/${id}`);
    return response.data.data;
  },

  create: async (data: CreateGmailRequest): Promise<Gmail> => {
    const response = await apiClient.post<ApiSuccessResponse<Gmail>>('/gmails/create', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateGmailRequest): Promise<Gmail> => {
    const response = await apiClient.put<ApiSuccessResponse<Gmail>>(
      `/gmails/update/${id}`,
      data
    );
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/gmails/delete/${id}`);
  },

  // Restore gmail from trash
  restore: async (id: string): Promise<Gmail> => {
    const response = await apiClient.post<ApiSuccessResponse<Gmail>>(`/gmails/restore/${id}`);
    return response.data.data;
  },

  // Permanently delete gmail
  permanentDelete: async (id: string): Promise<void> => {
    await apiClient.delete(`/gmails/permanent/${id}`);
  },

  // Check usage status for multiple gmails (does NOT create records)
  checkUsage: async (ids: string[]): Promise<CheckUsageResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<CheckUsageResponse>>(
      '/gmails/check-usage',
      { ids }
    );
    return response.data.data;
  },

  // Claim ownership for multiple gmails (creates usage records)
  claimOwnership: async (ids: string[]): Promise<ClaimOwnershipResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<ClaimOwnershipResponse>>(
      '/gmails/claim-ownership',
      { ids }
    );
    return response.data.data;
  },
};
