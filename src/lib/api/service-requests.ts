import { apiClient } from './client';
import {
  ApiSuccessResponse,
  PaginationMeta,
  ServiceRequest,
  ServiceRequestQuery,
} from '@/types';

export interface ServiceRequestListResponse {
  data: ServiceRequest[];
  pagination: PaginationMeta;
}

export const serviceRequestApi = {
  create: async (data: Record<string, unknown>): Promise<ServiceRequest> => {
    const response = await apiClient.post<ApiSuccessResponse<ServiceRequest>>(
      '/service-requests/create',
      data
    );
    return response.data.data;
  },

  getAll: async (query?: ServiceRequestQuery): Promise<ServiceRequestListResponse> => {
    const response = await apiClient.get<
      ApiSuccessResponse<ServiceRequest[]> & { meta?: PaginationMeta }
    >('/service-requests/list', { params: query });
    return {
      data: response.data.data,
      pagination: response.data.meta || { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  },

  getById: async (id: string): Promise<ServiceRequest> => {
    const response = await apiClient.get<ApiSuccessResponse<ServiceRequest>>(
      `/service-requests/${id}`
    );
    return response.data.data;
  },

  updateStatus: async (id: string, status: string): Promise<ServiceRequest> => {
    const response = await apiClient.put<ApiSuccessResponse<ServiceRequest>>(
      `/service-requests/${id}/status`,
      { status }
    );
    return response.data.data;
  },

  quickUpdate: async (id: string, data: { idTool?: string | null; runCount?: number; target?: string | null; status?: string }): Promise<ServiceRequest> => {
    const response = await apiClient.put<ApiSuccessResponse<ServiceRequest>>(
      `/service-requests/${id}/quick-update`,
      data
    );
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/service-requests/delete/${id}`);
  },
};
