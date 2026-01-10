'use client';

import { format } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CustomTooltip } from '../custom-tooltip';
import { getTypeLabel } from '@/lib/constants';

interface AllocationDailyData {
  date: string;
  allocations: number;
  success: number;
  failure: number;
  successRate: number;
}

interface AllocationSummary {
  totalAllocations: number;
  totalSuccess: number;
  totalFailure: number;
  avgDailyAllocations: number;
}

interface TopWebsite {
  websiteId: string;
  domain: string;
  types?: string[];
  allocations: number;
  success: number;
  successRate: number;
}

interface AllocationsTabProps {
  days: string;
  allocationStats?: {
    daily: AllocationDailyData[];
    summary: AllocationSummary;
  };
  topWebsites?: TopWebsite[];
  loadingAllocations: boolean;
  loadingTopWebsites: boolean;
}

export function AllocationsTab({
  days,
  allocationStats,
  topWebsites,
  loadingAllocations,
  loadingTopWebsites,
}: AllocationsTabProps) {
  // Format allocation data for chart
  const allocationChartData = allocationStats?.daily.map((d) => ({
    date: format(new Date(d.date), 'dd/MM'),
    fullDate: d.date,
    Allocations: d.allocations,
    Success: d.success,
    Failure: d.failure,
    'Success Rate': d.successRate,
  })) || [];

  return (
    <div className="space-y-4">
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
                          {website.types?.map(t => getTypeLabel(t)).join(', ') || '-'}
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
    </div>
  );
}
