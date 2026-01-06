'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  Globe,
  TrendingUp,
  Activity,
  CheckCircle,
  Calendar,
  ArrowUp,
  ArrowDown,
  BarChart3,
  PieChartIcon,
  Edit3,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { statisticsApi } from '@/lib/api';
import {
  PERIOD_OPTIONS,
  getStatusColor,
  getStatusLabel,
  getTypeColor,
  getTypeLabel,
} from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';
import { Role } from '@/types';
import CTVStatistics from '@/components/statistics/ctv-statistics';
import DEVStatistics from '@/components/statistics/dev-statistics';

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[150px]">
      <p className="font-medium text-sm mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium" style={{ color: entry.color }}>
            {typeof entry.value === 'number' && entry.name?.includes('Rate')
              ? `${entry.value}%`
              : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

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

function AdminStatistics() {
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

  // Format data for pie charts
  const statusPieData = statusStats?.map((s) => ({
    name: getStatusLabel(s.status),
    value: s.count,
    color: getStatusColor(s.status),
  })) || [];

  const typePieData = typeStats?.map((t) => ({
    name: getTypeLabel(t.type),
    value: t.count,
    color: getTypeColor(t.type),
  })) || [];

  // Format allocation data for chart
  const allocationChartData = allocationStats?.daily.map((d) => ({
    date: format(new Date(d.date), 'dd/MM'),
    fullDate: d.date,
    Allocations: d.allocations,
    Success: d.success,
    Failure: d.failure,
    'Success Rate': d.successRate,
  })) || [];

  // Format trends data
  const trendsChartData = trends?.map((t) => ({
    date: format(new Date(t.date), 'dd/MM'),
    'Websites mới': t.websitesCreated,
    'Lượt chỉnh sửa': t.edits,
  })) || [];

  // Format status changes data for comparison chart
  const statusChangesBarData = statusChanges ? [
    {
      status: 'NEW',
      label: getStatusLabel('NEW'),
      current: statusChanges.changes.NEW.current,
      past: statusChanges.changes.NEW.past,
      change: statusChanges.changes.NEW.change,
      color: getStatusColor('NEW'),
    },
    {
      status: 'RUNNING',
      label: getStatusLabel('RUNNING'),
      current: statusChanges.changes.RUNNING.current,
      past: statusChanges.changes.RUNNING.past,
      change: statusChanges.changes.RUNNING.change,
      color: getStatusColor('RUNNING'),
    },
    {
      status: 'ERROR',
      label: getStatusLabel('ERROR'),
      current: statusChanges.changes.ERROR.current,
      past: statusChanges.changes.ERROR.past,
      change: statusChanges.changes.ERROR.change,
      color: getStatusColor('ERROR'),
    },
    {
      status: 'PENDING',
      label: getStatusLabel('PENDING'),
      current: statusChanges.changes.PENDING.current,
      past: statusChanges.changes.PENDING.past,
      change: statusChanges.changes.PENDING.change,
      color: getStatusColor('PENDING'),
    },
    {
      status: 'CHECKING',
      label: getStatusLabel('CHECKING'),
      current: statusChanges.changes.CHECKING.current,
      past: statusChanges.changes.CHECKING.past,
      change: statusChanges.changes.CHECKING.change,
      color: getStatusColor('CHECKING'),
    },
    {
      status: 'HANDING',
      label: getStatusLabel('HANDING'),
      current: statusChanges.changes.HANDING.current,
      past: statusChanges.changes.HANDING.past,
      change: statusChanges.changes.HANDING.change,
      color: getStatusColor('HANDING'),
    },
    {
      status: 'MAINTENANCE',
      label: getStatusLabel('MAINTENANCE'),
      current: statusChanges.changes.MAINTENANCE.current,
      past: statusChanges.changes.MAINTENANCE.past,
      change: statusChanges.changes.MAINTENANCE.change,
      color: getStatusColor('MAINTENANCE'),
    },
  ] : [];

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Websites</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{overview?.totalWebsites.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +{overview?.websitesThisWeek} tuần này
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ Running</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {overview?.runningPercentage}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Websites đang hoạt động
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Allocations</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {overview?.allocationStats.totalAllocations.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Trong {overview?.allocationStats.period}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div
                  className={`text-2xl font-bold ${(overview?.allocationStats.overallSuccessRate || 0) >= 80
                    ? 'text-green-600'
                    : (overview?.allocationStats.overallSuccessRate || 0) >= 50
                      ? 'text-yellow-600'
                      : 'text-red-600'
                    }`}
                >
                  {overview?.allocationStats.overallSuccessRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Tỷ lệ thành công
                </p>
              </>
            )}
          </CardContent>
        </Card>
        </div>
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
        <TabsContent value="allocations" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Main Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Allocation theo ngày</CardTitle>
                <CardDescription>
                  Số lượng phân bổ và tỷ lệ thành công
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAllocations ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={allocationChartData}>
                        <defs>
                          <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorFailure" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="Success"
                          stroke="#22c55e"
                          fillOpacity={1}
                          fill="url(#colorSuccess)"
                        />
                        <Area
                          type="monotone"
                          dataKey="Failure"
                          stroke="#ef4444"
                          fillOpacity={1}
                          fill="url(#colorFailure)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Tổng kết</CardTitle>
                <CardDescription>Thống kê {days} ngày qua</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingAllocations ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">Tổng allocations</span>
                      <span className="font-bold">
                        {allocationStats?.summary.totalAllocations.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                      <span className="text-sm text-muted-foreground">Thành công</span>
                      <span className="font-bold text-green-600">
                        {allocationStats?.summary.totalSuccess.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10">
                      <span className="text-sm text-muted-foreground">Thất bại</span>
                      <span className="font-bold text-red-600">
                        {allocationStats?.summary.totalFailure.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
                      <span className="text-sm text-muted-foreground">Trung bình/ngày</span>
                      <span className="font-bold text-blue-600">
                        {allocationStats?.summary.avgDailyAllocations.toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Websites Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Websites</CardTitle>
              <CardDescription>Websites có hiệu suất cao nhất</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTopWebsites ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {topWebsites?.map((website, index) => (
                    <div
                      key={website.websiteId}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-muted-foreground w-6">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{website.domain}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(website.type)}
                            </Badge>
                            <span>{website.allocations.toLocaleString()} allocations</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-lg font-bold ${website.successRate >= 80
                            ? 'text-green-600'
                            : website.successRate >= 50
                              ? 'text-yellow-600'
                              : 'text-red-600'
                            }`}
                        >
                          {website.successRate}%
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {website.success} / {website.allocations}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Changes Tab */}
        <TabsContent value="status-changes" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Main Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>So sánh số lượng Website theo Status</CardTitle>
                <CardDescription>
                  So sánh hiện tại với {days} ngày trước
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStatusChanges ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : (
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={statusChangesBarData}
                        barGap={-48}
                        barCategoryGap="30%"
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="label" tick={{ fontSize: 14 }} />
                        <YAxis tick={{ fontSize: 14 }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[180px]">
                                <p className="font-medium text-sm mb-2">{data.label}</p>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Hiện tại:</span>
                                    <span className="font-medium">{data.current}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">{days} ngày trước:</span>
                                    <span className="font-medium">{data.past}</span>
                                  </div>
                                  <div className="flex justify-between border-t pt-1 mt-1">
                                    <span className="text-muted-foreground">Thay đổi:</span>
                                    <span className={`font-bold ${data.change > 0 ? 'text-green-600' : data.change < 0 ? 'text-red-600' : ''}`}>
                                      {data.change > 0 ? '+' : ''}{data.change}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Legend />
                        <Bar dataKey="past" name={`${days} ngày trước`} fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={48} />
                        <Bar dataKey="current" name="Hiện tại" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết biến động</CardTitle>
                <CardDescription>So sánh với {days} ngày trước</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingStatusChanges ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {statusChangesBarData.map((item) => (
                      <div
                        key={item.status}
                        className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-medium text-sm">{item.label}</span>
                          </div>
                          <span
                            className={`text-sm font-bold ${item.change > 0
                              ? 'text-green-600'
                              : item.change < 0
                                ? 'text-red-600'
                                : 'text-muted-foreground'
                              }`}
                          >
                            {item.change > 0 ? (
                              <span className="flex items-center gap-1">
                                <ArrowUp className="h-3 w-3" />
                                +{item.change}
                              </span>
                            ) : item.change < 0 ? (
                              <span className="flex items-center gap-1">
                                <ArrowDown className="h-3 w-3" />
                                {item.change}
                              </span>
                            ) : (
                              '0'
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{item.past} → {item.current}</span>
                        </div>
                      </div>
                    ))}

                    {/* Total summary */}
                    <div className="p-3 rounded-lg bg-muted/50 border-2 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Tổng cộng</span>
                        <span
                          className={`font-bold ${(statusChanges?.summary.totalChange || 0) > 0
                            ? 'text-green-600'
                            : (statusChanges?.summary.totalChange || 0) < 0
                              ? 'text-red-600'
                              : ''
                            }`}
                        >
                          {(statusChanges?.summary.totalChange || 0) > 0 ? '+' : ''}
                          {statusChanges?.summary.totalChange || 0}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {statusChanges?.summary.totalPast || 0} → {statusChanges?.summary.totalCurrent || 0} websites
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Phân bố theo Status</CardTitle>
                <CardDescription>Trạng thái các website</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStatus ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                        >
                          {statusPieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {/* Legend */}
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {statusPieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Phân bố theo Type</CardTitle>
                <CardDescription>Loại website</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingType ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                        >
                          {typePieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {/* Legend */}
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {typePieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Trends Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Xu hướng hoạt động</CardTitle>
                <CardDescription>Websites mới và lượt chỉnh sửa</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTrends ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendsChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="Websites mới"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Lượt chỉnh sửa"
                          stroke="#a855f7"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Editor Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  Top Editors
                </CardTitle>
                <CardDescription>Người chỉnh sửa nhiều nhất</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingEditors ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editorStats?.slice(0, 5).map((editor, index) => (
                      <div
                        key={editor.userId}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-muted-foreground w-5">
                            #{index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{editor.name}</p>
                            <p className="text-xs text-muted-foreground">{editor.email}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">{editor.editCount} edits</Badge>
                      </div>
                    ))}
                    {(!editorStats || editorStats.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Chưa có dữ liệu
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
