'use client';

/**
 * Statistics Page
 *
 * Hiển thị thống kê theo role:
 * - Admin/Manager: Thống kê toàn hệ thống
 * - DEV: Thống kê phát triển cá nhân
 * - CTV/Checker: Thống kê công việc cá nhân
 */

import { useAuthStore } from '@/stores/auth.store';
import { Role } from '@/types';

// Feature-based imports
import { AdminStatistics } from '@/features/statistics';

// Legacy imports (TODO: Migrate to features/)
import CTVStatistics from '@/components/statistics/ctv-statistics';
import DEVStatistics from '@/components/statistics/dev-statistics';

export default function StatisticsPage() {
  const { user } = useAuthStore();

  // Admin/Manager see full system statistics
  if (user?.role === Role.ADMIN || user?.role === Role.MANAGER) {
    return <AdminStatistics />;
  }

  // DEV sees their own development statistics
  if (user?.role === Role.DEV) {
    return <DEVStatistics />;
  }

  // CTV/CHECKER see their own statistics
  return <CTVStatistics />;
}
