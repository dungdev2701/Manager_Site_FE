import { apiClient } from './client';
import { ApiSuccessResponse } from '@/types';

// Types
export interface StatusCount {
  status: string;
  count: number;
  percentage: number;
}

export interface TypeCount {
  type: string;
  count: number;
  percentage: number;
}

export interface AllocationSummary {
  totalAllocations: number;
  totalSuccess: number;
  totalFailure: number;
  overallSuccessRate: number;
  period: string;
}

export interface OverviewStats {
  totalWebsites: number;
  totalUsers: number;
  websitesThisWeek: number;
  runningPercentage: number;
  statusCounts: { status: string; count: number }[];
  typeCounts: { type: string; count: number }[];
  allocationStats: AllocationSummary;
}

export interface DailyAllocationStat {
  date: string;
  allocations: number;
  success: number;
  failure: number;
  successRate: number;
}

export interface AllocationStats {
  daily: DailyAllocationStat[];
  summary: {
    totalAllocations: number;
    totalSuccess: number;
    totalFailure: number;
    overallSuccessRate: number;
    avgDailyAllocations: number;
  };
}

export interface TopWebsite {
  websiteId: string;
  domain: string;
  status: string;
  types: string[];
  allocations: number;
  success: number;
  failure: number;
  successRate: number;
}

export interface EditorStat {
  userId: string;
  name: string;
  email: string;
  role: string;
  editCount: number;
}

export interface DailyTrend {
  date: string;
  websitesCreated: number;
  edits: number;
}

export interface StatusChangeItem {
  current: number;
  past: number;
  change: number;
}

export interface StatusChangeStats {
  period: string;
  changes: {
    NEW: StatusChangeItem;
    CHECKING: StatusChangeItem;
    HANDING: StatusChangeItem;
    PENDING: StatusChangeItem;
    RUNNING: StatusChangeItem;
    ERROR: StatusChangeItem;
    MAINTENANCE: StatusChangeItem;
  };
  summary: {
    totalCurrent: number;
    totalPast: number;
    totalChange: number;
  };
}

// CTV Statistics Types
export interface CTVOverviewStats {
  totalWebsites: number;
  websitesThisWeek: number;
  completedCount: number;
  estimatedIncome: number;
  pricePerWebsite: number;
  statusCounts: { status: string; count: number }[];
  typeCounts: { type: string; count: number }[];
}

export interface CTVDailyTrend {
  date: string;
  websitesCreated: number;
}

export interface CTVStatusChangeStats extends StatusChangeStats {
  income: {
    current: number;
    past: number;
    change: number;
    pricePerWebsite: number;
  };
}

export interface CTVIncomeStats {
  totalCompletedCount: number;
  totalIncome: number;
  pricePerWebsite: number;
  completedWebsites: {
    id: string;
    domain: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }[];
  dailyIncome: {
    date: string;
    count: number;
    income: number;
  }[];
}

// DEV Statistics Types
export interface DEVOverviewStats {
  totalFixed: number;
  fixedThisWeek: number;
  errorCount: number;
  runningCount: number;
  pendingCount: number;
  promotedCount: number;
  successRate: number;
  totalAllocations: number;
  successAllocations: number;
}

export interface DEVDailyTrend {
  date: string;
  websitesFixed: number;
}

export interface DEVStatusChangeStats {
  period: string;
  changes: {
    PENDING: StatusChangeItem;
    RUNNING: StatusChangeItem;
    ERROR: StatusChangeItem;
  };
  summary: {
    totalCurrent: number;
    totalPast: number;
    totalChange: number;
  };
}

export interface DEVTopWebsite {
  websiteId: string;
  domain: string;
  status: string;
  types: string[];
  allocations: number;
  success: number;
  failure: number;
  successRate: number;
}

export interface DEVErrorWebsite {
  id: string;
  domain: string;
  status: string;
  types: string[];
  updatedAt: string;
  notes?: string;
}

interface DateRangeParams {
  startDate?: string;
  endDate?: string;
  days?: number;
}

interface TopWebsitesParams extends DateRangeParams {
  limit?: number;
  sortBy?: 'successRate' | 'allocations' | 'success' | 'failure';
  order?: 'asc' | 'desc';
}

export const statisticsApi = {
  // Get overview statistics
  getOverview: async (): Promise<OverviewStats> => {
    const response = await apiClient.get<ApiSuccessResponse<OverviewStats>>(
      '/statistics/overview'
    );
    return response.data.data;
  },

  // Get statistics by status
  getByStatus: async (): Promise<StatusCount[]> => {
    const response = await apiClient.get<ApiSuccessResponse<StatusCount[]>>(
      '/statistics/by-status'
    );
    return response.data.data;
  },

  // Get statistics by type
  getByType: async (): Promise<TypeCount[]> => {
    const response = await apiClient.get<ApiSuccessResponse<TypeCount[]>>(
      '/statistics/by-type'
    );
    return response.data.data;
  },

  // Get allocation statistics
  getAllocationStats: async (params?: DateRangeParams): Promise<AllocationStats> => {
    const response = await apiClient.get<ApiSuccessResponse<AllocationStats>>(
      '/statistics/allocations',
      { params }
    );
    return response.data.data;
  },

  // Get top performing websites
  getTopWebsites: async (params?: TopWebsitesParams): Promise<TopWebsite[]> => {
    const response = await apiClient.get<ApiSuccessResponse<TopWebsite[]>>(
      '/statistics/top-websites',
      { params }
    );
    return response.data.data;
  },

  // Get editor statistics
  getEditorStats: async (params?: DateRangeParams): Promise<EditorStat[]> => {
    const response = await apiClient.get<ApiSuccessResponse<EditorStat[]>>(
      '/statistics/editors',
      { params }
    );
    return response.data.data;
  },

  // Get daily trends
  getDailyTrends: async (params?: DateRangeParams): Promise<DailyTrend[]> => {
    const response = await apiClient.get<ApiSuccessResponse<DailyTrend[]>>(
      '/statistics/trends',
      { params }
    );
    return response.data.data;
  },

  // Get status changes over time
  getStatusChanges: async (params?: DateRangeParams): Promise<StatusChangeStats> => {
    const response = await apiClient.get<ApiSuccessResponse<StatusChangeStats>>(
      '/statistics/status-changes',
      { params }
    );
    return response.data.data;
  },

  // ============ CTV Statistics API ============

  // Get CTV overview statistics
  getCTVOverview: async (): Promise<CTVOverviewStats> => {
    const response = await apiClient.get<ApiSuccessResponse<CTVOverviewStats>>(
      '/statistics/my/overview'
    );
    return response.data.data;
  },

  // Get CTV statistics by status
  getCTVByStatus: async (): Promise<StatusCount[]> => {
    const response = await apiClient.get<ApiSuccessResponse<StatusCount[]>>(
      '/statistics/my/by-status'
    );
    return response.data.data;
  },

  // Get CTV statistics by type
  getCTVByType: async (): Promise<TypeCount[]> => {
    const response = await apiClient.get<ApiSuccessResponse<TypeCount[]>>(
      '/statistics/my/by-type'
    );
    return response.data.data;
  },

  // Get CTV daily trends
  getCTVDailyTrends: async (params?: DateRangeParams): Promise<CTVDailyTrend[]> => {
    const response = await apiClient.get<ApiSuccessResponse<CTVDailyTrend[]>>(
      '/statistics/my/trends',
      { params }
    );
    return response.data.data;
  },

  // Get CTV status changes over time
  getCTVStatusChanges: async (params?: DateRangeParams): Promise<CTVStatusChangeStats> => {
    const response = await apiClient.get<ApiSuccessResponse<CTVStatusChangeStats>>(
      '/statistics/my/status-changes',
      { params }
    );
    return response.data.data;
  },

  // Get CTV income statistics
  getCTVIncomeStats: async (params?: DateRangeParams): Promise<CTVIncomeStats> => {
    const response = await apiClient.get<ApiSuccessResponse<CTVIncomeStats>>(
      '/statistics/my/income',
      { params }
    );
    return response.data.data;
  },

  // ============ DEV Statistics API ============

  // Get DEV overview statistics
  getDEVOverview: async (): Promise<DEVOverviewStats> => {
    const response = await apiClient.get<ApiSuccessResponse<DEVOverviewStats>>(
      '/statistics/dev/overview'
    );
    return response.data.data;
  },

  // Get DEV statistics by status
  getDEVByStatus: async (): Promise<StatusCount[]> => {
    const response = await apiClient.get<ApiSuccessResponse<StatusCount[]>>(
      '/statistics/dev/by-status'
    );
    return response.data.data;
  },

  // Get DEV daily trends
  getDEVDailyTrends: async (params?: DateRangeParams): Promise<DEVDailyTrend[]> => {
    const response = await apiClient.get<ApiSuccessResponse<DEVDailyTrend[]>>(
      '/statistics/dev/trends',
      { params }
    );
    return response.data.data;
  },

  // Get DEV status changes over time
  getDEVStatusChanges: async (params?: DateRangeParams): Promise<DEVStatusChangeStats> => {
    const response = await apiClient.get<ApiSuccessResponse<DEVStatusChangeStats>>(
      '/statistics/dev/status-changes',
      { params }
    );
    return response.data.data;
  },

  // Get DEV top performing websites
  getDEVTopWebsites: async (params?: { limit?: number; sortBy?: 'successRate' | 'allocations' }): Promise<DEVTopWebsite[]> => {
    const response = await apiClient.get<ApiSuccessResponse<DEVTopWebsite[]>>(
      '/statistics/dev/top-websites',
      { params }
    );
    return response.data.data;
  },

  // Get DEV error websites
  getDEVErrorWebsites: async (): Promise<DEVErrorWebsite[]> => {
    const response = await apiClient.get<ApiSuccessResponse<DEVErrorWebsite[]>>(
      '/statistics/dev/error-websites'
    );
    return response.data.data;
  },
};
