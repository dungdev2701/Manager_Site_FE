'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Wrench,
  Activity,
  Calendar,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  XCircle,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { statisticsApi } from '@/lib/api';
import {
  PERIOD_OPTIONS,
  getStatusColor,
  getStatusLabel,
} from '@/lib/constants';
import { useAuthStore } from '@/stores';

export default function DEVStatistics() {
  const [days, setDays] = useState('30');
  const { user } = useAuthStore();

  // Fetch DEV data - include user.id in query keys to prevent cache issues when switching accounts
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['dev-statistics', 'overview', user?.id],
    queryFn: () => statisticsApi.getDEVOverview(),
    enabled: !!user,
  });

  const { data: byStatus, isLoading: loadingByStatus } = useQuery({
    queryKey: ['dev-statistics', 'by-status', user?.id],
    queryFn: () => statisticsApi.getDEVByStatus(),
    enabled: !!user,
  });

  const { data: statusChanges, isLoading: loadingStatusChanges } = useQuery({
    queryKey: ['dev-statistics', 'status-changes', days, user?.id],
    queryFn: () => statisticsApi.getDEVStatusChanges({ days: parseInt(days) }),
    enabled: !!user,
  });

  const { data: topWebsites, isLoading: loadingTopWebsites } = useQuery({
    queryKey: ['dev-statistics', 'top-websites', user?.id],
    queryFn: () => statisticsApi.getDEVTopWebsites({ limit: 10, sortBy: 'successRate' }),
    enabled: !!user,
  });

  const { data: errorWebsites, isLoading: loadingErrorWebsites } = useQuery({
    queryKey: ['dev-statistics', 'error-websites', user?.id],
    queryFn: () => statisticsApi.getDEVErrorWebsites(),
    enabled: !!user,
  });

  // Format status changes data for comparison chart
  const statusChangesBarData = statusChanges ? [
    {
      status: 'PENDING',
      label: getStatusLabel('PENDING'),
      current: statusChanges.changes.PENDING.current,
      past: statusChanges.changes.PENDING.past,
      change: statusChanges.changes.PENDING.change,
      color: getStatusColor('PENDING'),
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
  ] : [];

  // Pie chart data for status distribution
  const statusPieData = byStatus?.map((item) => ({
    name: getStatusLabel(item.status),
    value: item.count,
    color: getStatusColor(item.status),
  })) || [];

  // Success rate color
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Thống kê DEV</h1>
          <p className="text-muted-foreground">
            Thống kê các website bạn fix và tăng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px]">
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
      <div className="grid gap-4 md:grid-cols-4">
        {/* Total Fixed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Website đã fix</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {overview?.totalFixed?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{overview?.fixedThisWeek || 0} tuần này
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỉ lệ thành công</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${getSuccessRateColor(overview?.successRate || 0)}`}>
                  {overview?.successRate?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {overview?.successAllocations?.toLocaleString() || 0}/{overview?.totalAllocations?.toLocaleString() || 0} allocations
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Promoted (PENDING -> RUNNING) */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Website tăng</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {overview?.promotedCount?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pending &rarr; Running
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Error Count */}
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Website bỏ</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  {overview?.errorCount?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Status: ERROR
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Hiệu suất
          </TabsTrigger>
          <TabsTrigger value="status-changes" className="gap-2">
            <Activity className="h-4 w-4" />
            Biến động
          </TabsTrigger>
          <TabsTrigger value="errors" className="gap-2">
            <XCircle className="h-4 w-4" />
            Website lỗi
          </TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Status Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Phân bổ Status</CardTitle>
                <CardDescription>
                  Website đã chỉnh sửa theo status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingByStatus ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {statusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Websites */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Website hiệu suất cao nhất</CardTitle>
                <CardDescription>
                  Website có tỉ lệ thành công cao nhất
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTopWebsites ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {topWebsites?.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Chua co du lieu
                      </p>
                    ) : (
                      topWebsites?.map((website, index) => (
                        <div
                          key={website.websiteId}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-muted-foreground w-6">
                              #{index + 1}
                            </span>
                            <div>
                              <p className="font-medium text-sm truncate max-w-[200px]">
                                {website.domain}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-xs">
                                  {website.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {website.allocations} allocations
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${getSuccessRateColor(website.successRate)}`}>
                              {website.successRate.toFixed(1)}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {website.success}/{website.allocations}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Status Changes Tab */}
        <TabsContent value="status-changes" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Main Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>So sánh Status theo thời gian</CardTitle>
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
                        barGap={-28}
                        barCategoryGap="25%"
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
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
                                    <span className="text-muted-foreground">{days}Ngày trước:</span>
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
                        <Bar dataKey="past" name={`${days} ngay truoc`} fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={40} />
                        <Bar dataKey="current" name="Hien tai" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
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
                    {[1, 2, 3].map((i) => (
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
                          <span>{item.past} &rarr; {item.current}</span>
                        </div>
                      </div>
                    ))}

                    {/* Promoted highlight */}
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-200 dark:border-green-800 mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-sm">Website tăng</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          +{overview?.promotedCount || 0}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pending &rarr; Running
                      </p>
                    </div>

                    {/* Total summary */}
                    <div className="p-3 rounded-lg bg-muted/50 border-2 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Tổng websites</span>
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
                        {statusChanges?.summary.totalPast || 0} &rarr; {statusChanges?.summary.totalCurrent || 0} websites
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Error Websites Tab */}
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Website lỗi (ERROR)
              </CardTitle>
              <CardDescription>
                Danh sach website đã bỏ
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingErrorWebsites ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {errorWebsites?.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-lg font-medium text-green-600">Không có website lỗi!</p>
                      <p className="text-sm text-muted-foreground">
                        Tất cả website bạn chỉnh sửa đều hoạt động tốt<table></table>
                      </p>
                    </div>
                  ) : (
                    errorWebsites?.map((website) => (
                      <div
                        key={website.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{website.domain}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {website.type}
                            </Badge>
                            {website.notes && (
                              <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                {website.notes}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">ERROR</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(website.updatedAt), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
