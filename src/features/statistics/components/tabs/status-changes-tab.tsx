'use client';

/**
 * StatusChangesTab Component
 *
 * Tab hiển thị biến động websites theo status:
 * - Chart so sánh số lượng hiện tại vs quá khứ
 * - Chi tiết biến động từng status
 */

import { ArrowUp, ArrowDown } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getStatusColor, getStatusLabel } from '@/lib/constants';
import { StatusChangeStats } from '../../types';

interface StatusChangesTabProps {
  days: string;
  statusChanges?: StatusChangeStats;
  isLoading: boolean;
}

interface StatusBarData {
  status: string;
  label: string;
  current: number;
  past: number;
  change: number;
  color: string;
}

export function StatusChangesTab({ days, statusChanges, isLoading }: StatusChangesTabProps) {
  // Format status changes data for comparison chart
  const statusChangesBarData: StatusBarData[] = statusChanges ? [
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
          {isLoading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : statusChangesBarData.length === 0 ? (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              Chưa có dữ liệu
            </div>
          ) : (
            <div className="h-[350px] min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
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
                      const data = payload[0].payload as StatusBarData;
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
          {isLoading ? (
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
  );
}
