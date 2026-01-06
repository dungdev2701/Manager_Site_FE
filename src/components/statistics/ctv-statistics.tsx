'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Globe,
  Activity,
  Calendar,
  ArrowUp,
  ArrowDown,
  DollarSign,
  CheckCircle,
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
import { statisticsApi } from '@/lib/api';
import {
  PERIOD_OPTIONS,
  getStatusColor,
  getStatusLabel,
} from '@/lib/constants';
import { useAuthStore } from '@/stores';

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export default function CTVStatistics() {
  const [days, setDays] = useState('30');
  const { user } = useAuthStore();

  // Fetch CTV data - include user.id in query keys to prevent cache issues when switching accounts
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['ctv-statistics', 'overview', user?.id],
    queryFn: () => statisticsApi.getCTVOverview(),
    enabled: !!user,
  });

  const { data: statusChanges, isLoading: loadingStatusChanges } = useQuery({
    queryKey: ['ctv-statistics', 'status-changes', days, user?.id],
    queryFn: () => statisticsApi.getCTVStatusChanges({ days: parseInt(days) }),
    enabled: !!user,
  });

  const { data: incomeStats, isLoading: loadingIncome } = useQuery({
    queryKey: ['ctv-statistics', 'income', days, user?.id],
    queryFn: () => statisticsApi.getCTVIncomeStats({ days: parseInt(days) }),
    enabled: !!user,
  });

  // Format income chart data
  const incomeChartData = incomeStats?.dailyIncome.map((d) => ({
    date: format(new Date(d.date), 'dd/MM'),
    'Số lượng': d.count,
    'Thu nhập': d.income,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Thống kê của tôi</h1>
          <p className="text-muted-foreground">
            Thống kê các website bạn đã thêm vào hệ thống
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
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Websites */}
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
                <div className="text-2xl font-bold">
                  {overview?.totalWebsites.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{overview?.websitesThisWeek} tuần này
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Completed Count (PENDING + RUNNING) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Website hoàn thành</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-600">
                  {overview?.completedCount?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pending + Running
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Estimated Income */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Thu nhập ước tính</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(overview?.estimatedIncome || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(overview?.pricePerWebsite || 20000)}/website
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="income" className="space-y-4">
        <TabsList>
          <TabsTrigger value="income" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Thu nhập
          </TabsTrigger>
          <TabsTrigger value="status-changes" className="gap-2">
            <Activity className="h-4 w-4" />
            Biến động
          </TabsTrigger>
        </TabsList>

        {/* Income Tab */}
        <TabsContent value="income" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Income Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Thu nhập theo ngày</CardTitle>
                <CardDescription>
                  Website hoàn thành (Pending/Running) trong {days} ngày qua
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingIncome ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={incomeChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[150px]">
                                <p className="font-medium text-sm mb-2">{label}</p>
                                {payload.map((entry, index) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{entry.name}:</span>
                                    <span className="font-medium" style={{ color: entry.color }}>
                                      {entry.name === 'Thu nhập'
                                        ? formatCurrency(entry.value as number)
                                        : entry.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="Số lượng" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="Thu nhập" stroke="#22c55e" strokeWidth={2} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Income Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Tổng kết thu nhập</CardTitle>
                <CardDescription>Dựa trên website hoàn thành (Pending + Running)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingIncome ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-200 dark:border-green-800">
                      <p className="text-sm text-muted-foreground mb-1">Tổng thu nhập</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(incomeStats?.totalIncome || 0)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Website hoàn thành</span>
                        <span className="font-bold">{incomeStats?.totalCompletedCount}</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Đơn giá</span>
                        <span className="font-medium">{formatCurrency(incomeStats?.pricePerWebsite || 20000)}</span>
                      </div>
                    </div>

                    {/* Recent completed websites */}
                    {incomeStats?.completedWebsites && incomeStats.completedWebsites.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Website hoàn thành gần đây</p>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {incomeStats.completedWebsites.slice(0, 5).map((website) => (
                            <div
                              key={website.id}
                              className="text-sm p-2 rounded bg-muted/30 flex justify-between items-center"
                            >
                              <span className="truncate flex-1">{website.domain}</span>
                              <div className="flex items-center gap-2 ml-2">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  website.status === 'RUNNING'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                }`}>
                                  {website.status === 'RUNNING' ? 'Running' : 'Pending'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(website.updatedAt), 'dd/MM')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
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
                        <Bar dataKey="past" name={`${days} ngày trước`} fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={40} />
                        <Bar dataKey="current" name="Hiện tại" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary with Income */}
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết biến động</CardTitle>
                <CardDescription>So sánh với {days} ngày trước</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingStatusChanges ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
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

                    {/* Income change */}
                    {statusChanges?.income && (
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-200 dark:border-green-800 mt-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-sm">Thu nhập</span>
                          </div>
                          <span
                            className={`text-sm font-bold ${statusChanges.income.change > 0
                              ? 'text-green-600'
                              : statusChanges.income.change < 0
                                ? 'text-red-600'
                                : ''
                              }`}
                          >
                            {statusChanges.income.change > 0 ? '+' : ''}
                            {formatCurrency(statusChanges.income.change)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(statusChanges.income.past)} &rarr; {formatCurrency(statusChanges.income.current)}
                        </div>
                      </div>
                    )}

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
      </Tabs>
    </div>
  );
}
