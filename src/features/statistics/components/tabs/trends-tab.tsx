'use client';

/**
 * TrendsTab Component
 *
 * Tab hiển thị xu hướng hoạt động:
 * - Line chart websites mới và lượt chỉnh sửa
 * - Top editors
 */

import { format } from 'date-fns';
import { Edit3 } from 'lucide-react';
import {
  LineChart,
  Line,
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
import { CustomTooltip } from '../shared';
import { DailyTrend, EditorStat } from '../../types';

interface TrendsTabProps {
  trends?: DailyTrend[];
  editorStats?: EditorStat[];
  loadingTrends: boolean;
  loadingEditors: boolean;
}

export function TrendsTab({
  trends,
  editorStats,
  loadingTrends,
  loadingEditors,
}: TrendsTabProps) {
  // Format trends data
  const trendsChartData = trends?.map((t) => ({
    date: format(new Date(t.date), 'dd/MM'),
    'Websites mới': t.websitesCreated,
    'Lượt chỉnh sửa': t.edits,
  })) || [];

  return (
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
          ) : trendsChartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Chưa có dữ liệu
            </div>
          ) : (
            <div className="h-[300px] min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
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
  );
}
