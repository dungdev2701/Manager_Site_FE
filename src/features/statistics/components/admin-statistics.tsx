'use client';

/**
 * AdminStatistics Component
 *
 * Component chính hiển thị thống kê cho Admin:
 * - Overview cards
 * - Tabs: Allocations, Biến động Websites, Phân bố, Xu hướng
 *
 * Sử dụng useAdminStatistics hook để quản lý data fetching
 */

import { useState, useMemo } from 'react';
import { format, subDays, differenceInDays } from 'date-fns';
import { BarChart3, Activity, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';

import { useAdminStatistics } from '../hooks';
import { OverviewCards } from './shared';
import { AllocationsTab, StatusChangesTab, DistributionTab, TrendsTab } from './tabs';

export function AdminStatistics() {
  // Default: 30 ngày gần nhất
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  // Convert DateRange to startDate/endDate strings
  const { startDate, endDate, displayDays } = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return { startDate: undefined, endDate: undefined, displayDays: '30' };
    }

    const days = differenceInDays(dateRange.to, dateRange.from) + 1;

    return {
      startDate: format(dateRange.from, 'yyyy-MM-dd'),
      endDate: format(dateRange.to, 'yyyy-MM-dd'),
      displayDays: days.toString(),
    };
  }, [dateRange]);

  // Sử dụng custom hook để fetch tất cả data
  const {
    overview,
    statusStats,
    typeStats,
    allocationStats,
    topWebsites,
    editorStats,
    trends,
    statusChanges,
    isLoading,
  } = useAdminStatistics({ startDate, endDate });

  return (
    <div className="space-y-6">
      {/* Sticky Header + Overview */}
      <div className="sticky top-0 z-20 bg-muted -mx-4 lg:-mx-6 px-4 lg:px-6 pt-0 pb-4 space-y-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Thống kê</h1>
            <p className="text-muted-foreground">
              Tổng quan về hoạt động và hiệu suất hệ thống
            </p>
          </div>

          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
        </div>

        {/* Overview Cards */}
        <OverviewCards data={overview} isLoading={isLoading.overview} />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="allocations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="allocations" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Allocations
          </TabsTrigger>
          <TabsTrigger value="status-changes" className="gap-2">
            <Activity className="h-4 w-4" />
            Biến động Websites
          </TabsTrigger>
          <TabsTrigger value="distribution" className="gap-2">
            <PieChartIcon className="h-4 w-4" />
            Phân bố
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Xu hướng
          </TabsTrigger>
        </TabsList>

        {/* Allocations Tab */}
        <TabsContent value="allocations">
          <AllocationsTab
            days={displayDays}
            allocationStats={allocationStats}
            topWebsites={topWebsites}
            isLoading={{
              allocations: isLoading.allocations,
              topWebsites: isLoading.topWebsites,
            }}
          />
        </TabsContent>

        {/* Status Changes Tab */}
        <TabsContent value="status-changes">
          <StatusChangesTab
            days={displayDays}
            statusChanges={statusChanges}
            isLoading={isLoading.statusChanges}
          />
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution">
          <DistributionTab
            statusStats={statusStats}
            typeStats={typeStats}
            loadingStatus={isLoading.status}
            loadingType={isLoading.type}
          />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <TrendsTab
            trends={trends}
            editorStats={editorStats}
            loadingTrends={isLoading.trends}
            loadingEditors={isLoading.editors}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
