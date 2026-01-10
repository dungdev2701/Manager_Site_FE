'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, BarChart3, Activity, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { statisticsApi } from '@/lib/api';
import { PERIOD_OPTIONS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';

import { OverviewCards } from './overview-cards';
import { AllocationsTab, StatusChangesTab, DistributionTab, TrendsTab } from './tabs';

export function AdminStatistics() {
  const [days, setDays] = useState('30');
  const { user } = useAuthStore();

  // Fetch data - include user.id in query keys to prevent cache issues when switching accounts
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['statistics', 'overview', user?.id],
    queryFn: () => statisticsApi.getOverview(),
    enabled: !!user,
  });

  const { data: statusStats, isLoading: loadingStatus } = useQuery({
    queryKey: ['statistics', 'by-status', user?.id],
    queryFn: () => statisticsApi.getByStatus(),
    enabled: !!user,
  });

  const { data: typeStats, isLoading: loadingType } = useQuery({
    queryKey: ['statistics', 'by-type', user?.id],
    queryFn: () => statisticsApi.getByType(),
    enabled: !!user,
  });

  const { data: allocationStats, isLoading: loadingAllocations } = useQuery({
    queryKey: ['statistics', 'allocations', days, user?.id],
    queryFn: () => statisticsApi.getAllocationStats({ days: parseInt(days) }),
    enabled: !!user,
  });

  const { data: topWebsites, isLoading: loadingTopWebsites } = useQuery({
    queryKey: ['statistics', 'top-websites', days, user?.id],
    queryFn: () => statisticsApi.getTopWebsites({ days: parseInt(days), limit: 10 }),
    enabled: !!user,
  });

  const { data: editorStats, isLoading: loadingEditors } = useQuery({
    queryKey: ['statistics', 'editors', days, user?.id],
    queryFn: () => statisticsApi.getEditorStats({ days: parseInt(days) }),
    enabled: !!user,
  });

  const { data: trends, isLoading: loadingTrends } = useQuery({
    queryKey: ['statistics', 'trends', days, user?.id],
    queryFn: () => statisticsApi.getDailyTrends({ days: parseInt(days) }),
    enabled: !!user,
  });

  const { data: statusChanges, isLoading: loadingStatusChanges } = useQuery({
    queryKey: ['statistics', 'status-changes', days, user?.id],
    queryFn: () => statisticsApi.getStatusChanges({ days: parseInt(days) }),
    enabled: !!user,
  });

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

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[130px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overview Cards */}
        <OverviewCards data={overview} isLoading={loadingOverview} />
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
            days={days}
            allocationStats={allocationStats}
            topWebsites={topWebsites}
            loadingAllocations={loadingAllocations}
            loadingTopWebsites={loadingTopWebsites}
          />
        </TabsContent>

        {/* Status Changes Tab */}
        <TabsContent value="status-changes">
          <StatusChangesTab
            days={days}
            statusChanges={statusChanges}
            isLoading={loadingStatusChanges}
          />
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution">
          <DistributionTab
            statusStats={statusStats}
            typeStats={typeStats}
            loadingStatus={loadingStatus}
            loadingType={loadingType}
          />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <TrendsTab
            trends={trends}
            editorStats={editorStats}
            loadingTrends={loadingTrends}
            loadingEditors={loadingEditors}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
