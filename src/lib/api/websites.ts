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
  WebsiteType,
} from '@/types';

export interface BulkWebsiteItem {
  domain: string;
  types?: WebsiteType[];
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
    const response = await apiClient.get<ApiSuccessResponse<Website>>(`/websites/detail/${id}`);
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
    data: { domains: string[]; types?: WebsiteType[] }
  ): Promise<{ created: number; duplicates: string[]; invalid: string[]; total: number }> => {
    const response = await apiClient.post<
      ApiSuccessResponse<{
        created: number;
        duplicates: string[];
        invalid: string[];
        total: number;
      }>
    >('/websites/create-bulk', data);
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

  // Get website performance data
  getPerformance: async (
    id: string,
    options?: { startDate?: string; endDate?: string; days?: number }
  ): Promise<WebsitePerformanceResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<WebsitePerformanceResponse>>(
      `/websites/performance/${id}`,
      { params: options }
    );
    return response.data.data;
  },

  // Compare performance between two periods
  comparePerformance: async (
    id: string,
    period1Start: string,
    period1End: string,
    period2Start: string,
    period2End: string
  ): Promise<PerformanceComparisonResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<PerformanceComparisonResponse>>(
      `/websites/performance/${id}/compare`,
      {
        params: { period1Start, period1End, period2Start, period2End },
      }
    );
    return response.data.data;
  },
};

// Performance types
export interface PerformanceDataPoint {
  date: string;
  successRate: number | null; // null only when no historical data available
  allocationCount: number;
  successCount: number;
  failureCount: number;
  isCarriedForward?: boolean; // true if successRate is carried from previous day (no allocations today)
  editors?: {
    userId: string;
    userName: string | null;
    userEmail: string;
    editedAt: string;
    changes: Record<string, unknown>;
  }[];
}

// Stats for each editor's responsibility period
export interface EditorPerformanceStats {
  userId: string;
  userName: string | null;
  userEmail: string;
  editedAt: string; // When they made the edit
  periodStart: string; // Start of their responsibility period
  periodEnd: string; // End of their responsibility period (next edit or endDate)
  totalAllocations: number;
  totalSuccess: number;
  totalFailure: number;
  successRate: number | null; // null if no allocations in period
}

export interface WebsitePerformanceResponse {
  website: {
    id: string;
    domain: string;
    status: string;
    types: string[];
  };
  period: {
    startDate: string;
    endDate: string;
  };
  stats: {
    totalAllocations: number;
    totalSuccess: number;
    totalFailure: number;
    overallSuccessRate: number;
    editorCount: number;
  };
  editorStats: EditorPerformanceStats[]; // Stats per editor's period
  data: PerformanceDataPoint[];
}

export interface PerformanceComparisonResponse {
  period1: {
    start: string;
    end: string;
    totalAllocations: number;
    totalSuccess: number;
    totalFailure: number;
    overallSuccessRate: number;
  };
  period2: {
    start: string;
    end: string;
    totalAllocations: number;
    totalSuccess: number;
    totalFailure: number;
    overallSuccessRate: number;
  };
  improvement: {
    successRateChange: number;
    improved: boolean;
  };
}
