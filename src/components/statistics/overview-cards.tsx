'use client';

import { Globe, CheckCircle, Activity, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface OverviewData {
  totalWebsites: number;
  websitesThisWeek: number;
  runningPercentage: number;
  allocationStats: {
    totalAllocations: number;
    overallSuccessRate: number;
    period: string;
  };
}

interface OverviewCardsProps {
  data?: OverviewData;
  isLoading: boolean;
}

export function OverviewCards({ data, isLoading }: OverviewCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng Websites</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold">{data?.totalWebsites.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{data?.websitesThisWeek} tuần này
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
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold text-green-600">
                {data?.runningPercentage}%
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
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold">
                {data?.allocationStats.totalAllocations.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Trong {data?.allocationStats.period}
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
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div
                className={`text-2xl font-bold ${(data?.allocationStats.overallSuccessRate || 0) >= 80
                  ? 'text-green-600'
                  : (data?.allocationStats.overallSuccessRate || 0) >= 50
                    ? 'text-yellow-600'
                    : 'text-red-600'
                  }`}
              >
                {data?.allocationStats.overallSuccessRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                Tỷ lệ thành công
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
