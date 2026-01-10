'use client';

/**
 * DistributionTab Component
 *
 * Tab hiển thị phân bố websites:
 * - Pie chart theo Status
 * - Pie chart theo Type
 */

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getStatusColor, getStatusLabel, getTypeColor, getTypeLabel } from '@/lib/constants';
import { StatusCount, TypeCount } from '../../types';

interface DistributionTabProps {
  statusStats?: StatusCount[];
  typeStats?: TypeCount[];
  loadingStatus: boolean;
  loadingType: boolean;
}

interface PieData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

export function DistributionTab({
  statusStats,
  typeStats,
  loadingStatus,
  loadingType,
}: DistributionTabProps) {
  // Format data for pie charts
  const statusPieData: PieData[] = statusStats?.map((s) => ({
    name: getStatusLabel(s.status),
    value: s.count,
    color: getStatusColor(s.status),
  })) || [];

  const typePieData: PieData[] = typeStats?.map((t) => ({
    name: getTypeLabel(t.type),
    value: t.count,
    color: getTypeColor(t.type),
  })) || [];

  return (
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
          ) : statusPieData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Chưa có dữ liệu
            </div>
          ) : (
            <div className="h-[300px] min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
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
          ) : typePieData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Chưa có dữ liệu
            </div>
          ) : (
            <div className="h-[300px] min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
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
  );
}
