/**
 * Statistics Feature Module
 *
 * Module thống kê cho hệ thống quản lý website.
 *
 * Cấu trúc feature-based:
 * ├── api/           - API layer (gọi backend)
 * ├── components/    - UI components
 * │   ├── shared/    - Components dùng chung (tooltip, cards)
 * │   └── tabs/      - Tab components
 * ├── hooks/         - Custom hooks (data fetching, business logic)
 * ├── types/         - TypeScript interfaces
 * └── index.ts       - Public exports
 *
 * Cách sử dụng:
 * ```tsx
 * import { AdminStatistics, useAdminStatistics } from '@/features/statistics';
 *
 * // Trong page
 * export default function StatisticsPage() {
 *   return <AdminStatistics />;
 * }
 *
 * // Hoặc sử dụng hook riêng
 * const { overview, isLoading } = useAdminStatistics({ days: 30 });
 * ```
 */

// Components
export { AdminStatistics } from './components';
export { CustomTooltip, OverviewCards } from './components/shared';
export { AllocationsTab, StatusChangesTab, DistributionTab, TrendsTab } from './components/tabs';

// Hooks
export { useAdminStatistics, adminStatisticsKeys } from './hooks';

// API
export { adminStatisticsApi, ctvStatisticsApi, devStatisticsApi, statisticsApi } from './api';

// Types
export type {
  // Common
  StatusCount,
  TypeCount,
  StatusChangeItem,
  // Admin
  OverviewStats,
  AllocationStats,
  AllocationSummary,
  DailyAllocationStat,
  TopWebsite,
  EditorStat,
  DailyTrend,
  StatusChangeStats,
  // CTV
  CTVOverviewStats,
  CTVDailyTrend,
  CTVStatusChangeStats,
  CTVIncomeStats,
  // DEV
  DEVOverviewStats,
  DEVDailyTrend,
  DEVStatusChangeStats,
  DEVTopWebsite,
  DEVErrorWebsite,
  // Params
  DateRangeParams,
  TopWebsitesParams,
} from './types';
