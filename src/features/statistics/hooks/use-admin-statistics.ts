/**
 * useAdminStatistics Hook
 *
 * Custom hook để fetch và quản lý data cho Admin Statistics.
 * Tách logic data fetching ra khỏi component giúp:
 * - Component chỉ focus vào UI
 * - Dễ test hook riêng biệt
 * - Có thể reuse logic ở nhiều nơi
 * - Centralize query keys và caching logic
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { adminStatisticsApi } from '../api';
import { DateRangeParams } from '../types';

// Query keys - centralize để dễ invalidate và manage cache
export const adminStatisticsKeys = {
  all: ['statistics', 'admin'] as const,
  overview: (userId?: string) => [...adminStatisticsKeys.all, 'overview', userId] as const,
  byStatus: (userId?: string) => [...adminStatisticsKeys.all, 'by-status', userId] as const,
  byType: (userId?: string) => [...adminStatisticsKeys.all, 'by-type', userId] as const,
  allocations: (params: DateRangeParams, userId?: string) => [...adminStatisticsKeys.all, 'allocations', params, userId] as const,
  topWebsites: (params: DateRangeParams, userId?: string) => [...adminStatisticsKeys.all, 'top-websites', params, userId] as const,
  editors: (params: DateRangeParams, userId?: string) => [...adminStatisticsKeys.all, 'editors', params, userId] as const,
  trends: (params: DateRangeParams, userId?: string) => [...adminStatisticsKeys.all, 'trends', params, userId] as const,
  statusChanges: (params: DateRangeParams, userId?: string) => [...adminStatisticsKeys.all, 'status-changes', params, userId] as const,
};

interface UseAdminStatisticsOptions {
  /** Số ngày (dùng khi không có startDate/endDate) */
  days?: number;
  /** Ngày bắt đầu (format: YYYY-MM-DD) */
  startDate?: string;
  /** Ngày kết thúc (format: YYYY-MM-DD) */
  endDate?: string;
}

export function useAdminStatistics({ days, startDate, endDate }: UseAdminStatisticsOptions) {
  const { user } = useAuthStore();
  const userId = user?.id;

  // Build params từ days hoặc startDate/endDate
  const dateParams: DateRangeParams = startDate && endDate
    ? { startDate, endDate }
    : { days: days || 30 };

  // Overview - không phụ thuộc vào date range
  const overviewQuery = useQuery({
    queryKey: adminStatisticsKeys.overview(userId),
    queryFn: adminStatisticsApi.getOverview,
    enabled: !!user,
  });

  // Status distribution
  const statusQuery = useQuery({
    queryKey: adminStatisticsKeys.byStatus(userId),
    queryFn: adminStatisticsApi.getByStatus,
    enabled: !!user,
  });

  // Type distribution
  const typeQuery = useQuery({
    queryKey: adminStatisticsKeys.byType(userId),
    queryFn: adminStatisticsApi.getByType,
    enabled: !!user,
  });

  // Allocations - phụ thuộc vào date range
  const allocationsQuery = useQuery({
    queryKey: adminStatisticsKeys.allocations(dateParams, userId),
    queryFn: () => adminStatisticsApi.getAllocationStats(dateParams),
    enabled: !!user,
  });

  // Top websites
  const topWebsitesQuery = useQuery({
    queryKey: adminStatisticsKeys.topWebsites(dateParams, userId),
    queryFn: () => adminStatisticsApi.getTopWebsites({ ...dateParams, limit: 10 }),
    enabled: !!user,
  });

  // Editor stats
  const editorsQuery = useQuery({
    queryKey: adminStatisticsKeys.editors(dateParams, userId),
    queryFn: () => adminStatisticsApi.getEditorStats(dateParams),
    enabled: !!user,
  });

  // Trends
  const trendsQuery = useQuery({
    queryKey: adminStatisticsKeys.trends(dateParams, userId),
    queryFn: () => adminStatisticsApi.getDailyTrends(dateParams),
    enabled: !!user,
  });

  // Status changes
  const statusChangesQuery = useQuery({
    queryKey: adminStatisticsKeys.statusChanges(dateParams, userId),
    queryFn: () => adminStatisticsApi.getStatusChanges(dateParams),
    enabled: !!user,
  });

  return {
    // Data
    overview: overviewQuery.data,
    statusStats: statusQuery.data,
    typeStats: typeQuery.data,
    allocationStats: allocationsQuery.data,
    topWebsites: topWebsitesQuery.data,
    editorStats: editorsQuery.data,
    trends: trendsQuery.data,
    statusChanges: statusChangesQuery.data,

    // Loading states
    isLoading: {
      overview: overviewQuery.isLoading,
      status: statusQuery.isLoading,
      type: typeQuery.isLoading,
      allocations: allocationsQuery.isLoading,
      topWebsites: topWebsitesQuery.isLoading,
      editors: editorsQuery.isLoading,
      trends: trendsQuery.isLoading,
      statusChanges: statusChangesQuery.isLoading,
    },

    // Error states (if needed)
    errors: {
      overview: overviewQuery.error,
      status: statusQuery.error,
      type: typeQuery.error,
      allocations: allocationsQuery.error,
      topWebsites: topWebsitesQuery.error,
      editors: editorsQuery.error,
      trends: trendsQuery.error,
      statusChanges: statusChangesQuery.error,
    },

    // Refetch functions
    refetch: {
      overview: overviewQuery.refetch,
      all: () => {
        overviewQuery.refetch();
        statusQuery.refetch();
        typeQuery.refetch();
        allocationsQuery.refetch();
        topWebsitesQuery.refetch();
        editorsQuery.refetch();
        trendsQuery.refetch();
        statusChangesQuery.refetch();
      },
    },
  };
}
