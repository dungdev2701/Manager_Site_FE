'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from 'recharts';
import {
  Activity,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  User,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { websiteApi, PerformanceDataPoint, EditorPerformanceStats } from '@/lib/api/websites';
import { Website } from '@/types';

interface PerformanceDialogProps {
  website: Website | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PERIOD_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
];

// Colors for editor responsibility areas
const EDITOR_COLORS = [
  { fill: 'rgba(59, 130, 246, 0.1)', stroke: '#3b82f6' }, // blue
  { fill: 'rgba(168, 85, 247, 0.1)', stroke: '#a855f7' }, // purple
  { fill: 'rgba(236, 72, 153, 0.1)', stroke: '#ec4899' }, // pink
  { fill: 'rgba(245, 158, 11, 0.1)', stroke: '#f59e0b' }, // amber
  { fill: 'rgba(20, 184, 166, 0.1)', stroke: '#14b8a6' }, // teal
  { fill: 'rgba(239, 68, 68, 0.1)', stroke: '#ef4444' }, // red
];

interface ChartDataPoint extends PerformanceDataPoint {
  hasEdit: boolean;
  editorNames: string;
}

// Custom tooltip component for the chart
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: ChartDataPoint }[];
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="font-medium text-sm mb-2">{format(new Date(label || ''), 'dd/MM/yyyy')}</p>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Success Rate:</span>
          {data.successRate !== null ? (
            <span className={`font-medium ${data.successRate >= 80 ? 'text-green-600' :
                data.successRate >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
              {data.successRate}%
              {data.isCarriedForward}
            </span>
          ) : (
            <span className="text-muted-foreground">Chưa có dữ liệu</span>
          )}
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Allocations:</span>
          <span>{data.allocationCount}</span>
        </div>
        {data.allocationCount > 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Success:</span>
              <span className="text-green-600">{data.successCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Failure:</span>
              <span className="text-red-600">{data.failureCount}</span>
            </div>
          </>
        )}
      </div>

      {data.editors && data.editors.length > 0 && (
        <div className="mt-2 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            <User className="inline h-3 w-3 mr-1" />
            Edited by:
          </p>
          {data.editors.map((editor, idx) => (
            <div key={idx} className="text-xs">
              <span className="font-medium">{editor.userName || editor.userEmail}</span>
              <span className="text-muted-foreground ml-1">
                ({format(new Date(editor.editedAt), 'HH:mm')})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Custom dot component to show edit markers
function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}) {
  const { cx, cy, payload } = props;

  if (!cx || !cy || !payload) return null;

  // Don't show dot for days with no data at all (successRate is null)
  if (payload.successRate === null) return null;

  // Show a special marker if there was an edit on this day
  if (payload.hasEdit) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={3} fill="#fff" />
      </g>
    );
  }

  // Show hollow circle for carried forward days (no allocation but has historical data)
  if (payload.isCarriedForward) {
    return <circle cx={cx} cy={cy} r={3} fill="none" stroke="#10b981" strokeWidth={1.5} />;
  }

  // Normal day with actual allocation data
  return <circle cx={cx} cy={cy} r={3} fill="#10b981" />;
}

export function PerformanceDialog({
  website,
  open,
  onOpenChange,
}: PerformanceDialogProps) {
  const [days, setDays] = useState('30');

  const { data, isLoading, error } = useQuery({
    queryKey: ['website-performance', website?.id, days],
    queryFn: () => websiteApi.getPerformance(website!.id, { days: parseInt(days) }),
    enabled: open && !!website,
  });

  if (!website) return null;

  // Transform data for chart
  const chartData: ChartDataPoint[] = data?.data.map((point) => ({
    ...point,
    hasEdit: !!(point.editors && point.editors.length > 0),
    editorNames: point.editors?.map((e) => e.userName || e.userEmail).join(', ') || '',
  })) || [];

  // Find dates with edits for reference lines
  const editDates = chartData.filter((d) => d.hasEdit).map((d) => d.date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance: {website.domain}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Period Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Period:</span>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-[120px]">
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

            {data && (
              <div className="text-sm text-muted-foreground">
                {data.period.startDate} - {data.period.endDate}
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {isLoading ? (
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : data ? (
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Total Allocations</span>
                </div>
                <p className="text-2xl font-bold">{data.stats.totalAllocations.toLocaleString()}</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Success Rate</span>
                </div>
                <p className={`text-2xl font-bold ${data.stats.overallSuccessRate >= 80 ? 'text-green-600' :
                    data.stats.overallSuccessRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                  {data.stats.overallSuccessRate}%
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-xs text-muted-foreground">Total Failures</span>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {data.stats.totalFailure.toLocaleString()}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-muted-foreground">Editors</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{data.stats.editorCount}</p>
              </div>
            </div>
          ) : null}

          {/* Chart */}
          <div className="h-[350px] w-full">
            {isLoading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : error ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Failed to load performance data
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No performance data available for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                    className="text-xs"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    className="text-xs"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />

                  {/* Editor responsibility areas */}
                  {data?.editorStats?.map((editor, idx) => (
                    <ReferenceArea
                      key={`${editor.userId}-${editor.periodStart}`}
                      x1={editor.periodStart}
                      x2={editor.periodEnd}
                      fill={EDITOR_COLORS[idx % EDITOR_COLORS.length].fill}
                      fillOpacity={1}
                      stroke={EDITOR_COLORS[idx % EDITOR_COLORS.length].stroke}
                      strokeOpacity={0.3}
                      label={{
                        value: `${editor.userName || editor.userEmail.split('@')[0]}: ${editor.successRate !== null ? `${editor.successRate}%` : 'N/A'}`,
                        position: 'insideTop',
                        fill: EDITOR_COLORS[idx % EDITOR_COLORS.length].stroke,
                        fontSize: 10,
                        fontWeight: 500,
                      }}
                    />
                  ))}

                  {/* Reference lines for edit dates */}
                  {editDates.map((date) => (
                    <ReferenceLine
                      key={date}
                      x={date}
                      stroke="#3b82f6"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                  ))}

                  <Line
                    type="monotone"
                    dataKey="successRate"
                    name="Success Rate"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={<CustomDot />}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend for edit markers */}
          <div className="flex flex-wrap items-center gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Có dữ liệu</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-green-500 bg-transparent" />
              <span className="text-muted-foreground">Không phân bổ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <span className="text-muted-foreground">Có chỉnh sửa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 border-t-2 border-dashed border-blue-500" />
              <span className="text-muted-foreground">Mốc chỉnh sửa</span>
            </div>
          </div>

          {/* Editor Performance Stats */}
          {data && data.editorStats && data.editorStats.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Thống kê theo Editor
              </h4>
              <div className="grid gap-3">
                {data.editorStats.map((editor, idx) => (
                  <div
                    key={`${editor.userId}-${editor.periodStart}`}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                    style={{
                      backgroundColor: EDITOR_COLORS[idx % EDITOR_COLORS.length].fill,
                      borderColor: EDITOR_COLORS[idx % EDITOR_COLORS.length].stroke,
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: EDITOR_COLORS[idx % EDITOR_COLORS.length].stroke }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {editor.userName || editor.userEmail}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(editor.periodStart), 'dd/MM')} - {format(new Date(editor.periodEnd), 'dd/MM')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Allocations: {editor.totalAllocations}</span>
                        <span className="text-green-600">Success: {editor.totalSuccess}</span>
                        <span className="text-red-600">Failure: {editor.totalFailure}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {editor.successRate !== null ? (
                        <span
                          className={`text-lg font-bold ${
                            editor.successRate >= 80
                              ? 'text-green-600'
                              : editor.successRate >= 50
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {editor.successRate}%
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit History */}
          {data && editDates.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Lịch sử chỉnh sửa
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {chartData
                  .filter((d) => d.hasEdit)
                  .reverse()
                  .map((point) => (
                    <div
                      key={point.date}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border"
                    >
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {format(new Date(point.date), 'dd/MM/yyyy')}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Rate: {point.successRate}%
                          </Badge>
                        </div>
                        {point.editors?.map((editor, idx) => (
                          <div key={idx} className="text-sm text-muted-foreground">
                            <User className="inline h-3 w-3 mr-1" />
                            <span className="font-medium">
                              {editor.userName || editor.userEmail}
                            </span>
                            <span className="ml-1">
                              at {format(new Date(editor.editedAt), 'HH:mm')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
