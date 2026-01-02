'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks';
import { websiteApi } from '@/lib/api';
import { WebsiteStatus } from '@/types';
import { Globe, CheckCircle, XCircle, Clock } from 'lucide-react';

interface CircularProgressProps {
  percentage: number;
  gradientId: string;
  gradientColors: { start: string; end: string };
  size?: number;
  strokeWidth?: number;
}

function CircularProgress({
  percentage,
  gradientId,
  gradientColors,
  size = 56,
  strokeWidth = 6,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientColors.start} />
            <stop offset="100%" stopColor={gradientColors.end} />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/10"
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Percentage text in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-foreground">
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['websites', 'all'],
    queryFn: () => websiteApi.getAll({ limit: 10000 }),
  });

  const statsData = useMemo(() => {
    const websites = data?.websites || [];
    const total = websites.length;
    const running = websites.filter((w) => w.status === WebsiteStatus.RUNNING).length;
    const errors = websites.filter((w) => w.status === WebsiteStatus.ERROR).length;
    // Pending: NEW, CHECKING, HANDING, PENDING (awaiting check or dev)
    const pending = websites.filter(
      (w) => w.status === WebsiteStatus.PENDING ||
             w.status === WebsiteStatus.NEW ||
             w.status === WebsiteStatus.CHECKING ||
             w.status === WebsiteStatus.HANDING
    ).length;

    return { total, running, errors, pending };
  }, [data]);

  const stats = useMemo(() => {
    const { total, running, errors, pending } = statsData;
    const runningPercent = total > 0 ? (running / total) * 100 : 0;
    const errorsPercent = total > 0 ? (errors / total) * 100 : 0;
    const pendingPercent = total > 0 ? (pending / total) * 100 : 0;

    return [
      {
        title: 'Total Websites',
        value: total.toString(),
        description: 'Registered websites',
        icon: Globe,
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        showProgress: false,
        percentage: 100,
        gradientId: 'blue',
        gradientColors: { start: '#3b82f6', end: '#1d4ed8' },
      },
      {
        title: 'Running',
        value: running.toString(),
        description: 'Active websites',
        icon: CheckCircle,
        iconColor: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        showProgress: true,
        percentage: runningPercent,
        gradientId: 'green',
        gradientColors: { start: '#10b981', end: '#059669' },
      },
      {
        title: 'Errors',
        value: errors.toString(),
        description: 'Websites with errors',
        icon: XCircle,
        iconColor: 'text-rose-500',
        bgColor: 'bg-rose-500/10',
        showProgress: true,
        percentage: errorsPercent,
        gradientId: 'red',
        gradientColors: { start: '#f43f5e', end: '#e11d48' },
      },
      {
        title: 'Pending',
        value: pending.toString(),
        description: 'Awaiting check',
        icon: Clock,
        iconColor: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        showProgress: true,
        percentage: pendingPercent,
        gradientId: 'yellow',
        gradientColors: { start: '#f59e0b', end: '#d97706' },
      },
    ];
  }, [statsData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name}! Here&apos;s an overview of your websites.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                  )}
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
                {stat.showProgress && !isLoading && (
                  <CircularProgress
                    percentage={stat.percentage}
                    gradientId={stat.gradientId}
                    gradientColors={stat.gradientColors}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest website checks and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Go to Websites to manage your domains
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
