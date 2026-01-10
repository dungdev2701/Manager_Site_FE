/**
 * Statistics Module Types
 *
 * File này chứa tất cả types/interfaces cho module statistics.
 * Tách riêng types giúp:
 * - Dễ maintain và tìm kiếm
 * - Có thể import riêng types mà không kéo theo logic
 * - Rõ ràng về data structure của module
 */

// ============================================
// COMMON TYPES
// ============================================

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

export interface StatusChangeItem {
  current: number;
  past: number;
  change: number;
}

// ============================================
// ADMIN STATISTICS TYPES
// ============================================

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

// ============================================
// CTV STATISTICS TYPES
// ============================================

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

// ============================================
// DEV STATISTICS TYPES
// ============================================

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

// ============================================
// API PARAMS TYPES
// ============================================

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
  days?: number;
}

export interface TopWebsitesParams extends DateRangeParams {
  limit?: number;
  sortBy?: 'successRate' | 'allocations' | 'success' | 'failure';
  order?: 'asc' | 'desc';
}
