/**
 * Statistics API Layer
 *
 * File này chứa tất cả API calls cho module statistics.
 * Tách riêng API layer giúp:
 * - Dễ mock trong tests
 * - Thay đổi API endpoint không ảnh hưởng components
 * - Centralize error handling cho module
 */

import { apiClient } from '@/shared/lib/api-client';
import { ApiSuccessResponse } from '@/shared/types';
import {
  OverviewStats,
  StatusCount,
  TypeCount,
  AllocationStats,
  TopWebsite,
  EditorStat,
  DailyTrend,
  StatusChangeStats,
  CTVOverviewStats,
  CTVDailyTrend,
  CTVStatusChangeStats,
  CTVIncomeStats,
  DEVOverviewStats,
  DEVDailyTrend,
  DEVStatusChangeStats,
  DEVTopWebsite,
  DEVErrorWebsite,
  DateRangeParams,
  TopWebsitesParams,
} from '../types';

// ============================================
// ADMIN STATISTICS API
// ============================================

export const adminStatisticsApi = {
  getOverview: async (): Promise<OverviewStats> => {
    const response = await apiClient.get<ApiSuccessResponse<OverviewStats>>(
      '/statistics/overview'
    );
    return response.data.data;
  },

  getByStatus: async (): Promise<StatusCount[]> => {
    const response = await apiClient.get<ApiSuccessResponse<StatusCount[]>>(
      '/statistics/by-status'
    );
    return response.data.data;
  },

  getByType: async (): Promise<TypeCount[]> => {
    const response = await apiClient.get<ApiSuccessResponse<TypeCount[]>>(
      '/statistics/by-type'
    );
    return response.data.data;
  },

  getAllocationStats: async (params?: DateRangeParams): Promise<AllocationStats> => {
    const response = await apiClient.get<ApiSuccessResponse<AllocationStats>>(
      '/statistics/allocations',
      { params }
    );
    return response.data.data;
  },

  getTopWebsites: async (params?: TopWebsitesParams): Promise<TopWebsite[]> => {
    const response = await apiClient.get<ApiSuccessResponse<TopWebsite[]>>(
      '/statistics/top-websites',
      { params }
    );
    return response.data.data;
  },

  getEditorStats: async (params?: DateRangeParams): Promise<EditorStat[]> => {
    const response = await apiClient.get<ApiSuccessResponse<EditorStat[]>>(
      '/statistics/editors',
      { params }
    );
    return response.data.data;
  },

  getDailyTrends: async (params?: DateRangeParams): Promise<DailyTrend[]> => {
    const response = await apiClient.get<ApiSuccessResponse<DailyTrend[]>>(
      '/statistics/trends',
      { params }
    );
    return response.data.data;
  },

  getStatusChanges: async (params?: DateRangeParams): Promise<StatusChangeStats> => {
    const response = await apiClient.get<ApiSuccessResponse<StatusChangeStats>>(
      '/statistics/status-changes',
      { params }
    );
    return response.data.data;
  },
};

// ============================================
// CTV STATISTICS API
// ============================================

export const ctvStatisticsApi = {
  getOverview: async (): Promise<CTVOverviewStats> => {
    const response = await apiClient.get<ApiSuccessResponse<CTVOverviewStats>>(
      '/statistics/my/overview'
    );
    return response.data.data;
  },

  getByStatus: async (): Promise<StatusCount[]> => {
    const response = await apiClient.get<ApiSuccessResponse<StatusCount[]>>(
      '/statistics/my/by-status'
    );
    return response.data.data;
  },

  getByType: async (): Promise<TypeCount[]> => {
    const response = await apiClient.get<ApiSuccessResponse<TypeCount[]>>(
      '/statistics/my/by-type'
    );
    return response.data.data;
  },

  getDailyTrends: async (params?: DateRangeParams): Promise<CTVDailyTrend[]> => {
    const response = await apiClient.get<ApiSuccessResponse<CTVDailyTrend[]>>(
      '/statistics/my/trends',
      { params }
    );
    return response.data.data;
  },

  getStatusChanges: async (params?: DateRangeParams): Promise<CTVStatusChangeStats> => {
    const response = await apiClient.get<ApiSuccessResponse<CTVStatusChangeStats>>(
      '/statistics/my/status-changes',
      { params }
    );
    return response.data.data;
  },

  getIncomeStats: async (params?: DateRangeParams): Promise<CTVIncomeStats> => {
    const response = await apiClient.get<ApiSuccessResponse<CTVIncomeStats>>(
      '/statistics/my/income',
      { params }
    );
    return response.data.data;
  },
};

// ============================================
// DEV STATISTICS API
// ============================================

export const devStatisticsApi = {
  getOverview: async (): Promise<DEVOverviewStats> => {
    const response = await apiClient.get<ApiSuccessResponse<DEVOverviewStats>>(
      '/statistics/dev/overview'
    );
    return response.data.data;
  },

  getByStatus: async (): Promise<StatusCount[]> => {
    const response = await apiClient.get<ApiSuccessResponse<StatusCount[]>>(
      '/statistics/dev/by-status'
    );
    return response.data.data;
  },

  getDailyTrends: async (params?: DateRangeParams): Promise<DEVDailyTrend[]> => {
    const response = await apiClient.get<ApiSuccessResponse<DEVDailyTrend[]>>(
      '/statistics/dev/trends',
      { params }
    );
    return response.data.data;
  },

  getStatusChanges: async (params?: DateRangeParams): Promise<DEVStatusChangeStats> => {
    const response = await apiClient.get<ApiSuccessResponse<DEVStatusChangeStats>>(
      '/statistics/dev/status-changes',
      { params }
    );
    return response.data.data;
  },

  getTopWebsites: async (params?: { limit?: number; sortBy?: 'successRate' | 'allocations' }): Promise<DEVTopWebsite[]> => {
    const response = await apiClient.get<ApiSuccessResponse<DEVTopWebsite[]>>(
      '/statistics/dev/top-websites',
      { params }
    );
    return response.data.data;
  },

  getErrorWebsites: async (): Promise<DEVErrorWebsite[]> => {
    const response = await apiClient.get<ApiSuccessResponse<DEVErrorWebsite[]>>(
      '/statistics/dev/error-websites'
    );
    return response.data.data;
  },
};

// Legacy export for backward compatibility
// Sẽ được xóa sau khi migrate xong toàn bộ
export const statisticsApi = {
  ...adminStatisticsApi,
  // CTV
  getCTVOverview: ctvStatisticsApi.getOverview,
  getCTVByStatus: ctvStatisticsApi.getByStatus,
  getCTVByType: ctvStatisticsApi.getByType,
  getCTVDailyTrends: ctvStatisticsApi.getDailyTrends,
  getCTVStatusChanges: ctvStatisticsApi.getStatusChanges,
  getCTVIncomeStats: ctvStatisticsApi.getIncomeStats,
  // DEV
  getDEVOverview: devStatisticsApi.getOverview,
  getDEVByStatus: devStatisticsApi.getByStatus,
  getDEVDailyTrends: devStatisticsApi.getDailyTrends,
  getDEVStatusChanges: devStatisticsApi.getStatusChanges,
  getDEVTopWebsites: devStatisticsApi.getTopWebsites,
  getDEVErrorWebsites: devStatisticsApi.getErrorWebsites,
};
