'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RotateCcw, Save, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { systemConfigApi } from '@/lib/api';
import { SystemConfig } from '@/types';

// Group configs by category for display
interface ConfigGroup {
  title: string;
  description: string;
  keys: string[];
}

const CONFIG_GROUPS: ConfigGroup[] = [
  {
    title: 'Phân bổ (Allocation)',
    description: 'Cấu hình liên quan đến phân bổ websites cho các request',
    keys: [
      'ALLOCATION_MULTIPLIER',
      'MAX_DAILY_ALLOCATIONS',
      'TRAFFIC_THRESHOLD',
      'REALLOCATION_ENABLED',
      'MAX_BATCHES_PER_REQUEST',
    ],
  },
  {
    title: 'Timeout',
    description: 'Cấu hình thời gian timeout cho task và request',
    keys: [
      'CLAIM_TIMEOUT_MINUTES',
      'REQUEST_COMPLETION_TIME_PER_100',
    ],
  },
  {
    title: 'Retry',
    description: 'Cấu hình liên quan đến retry khi task thất bại',
    keys: [
      'MAX_RETRY_COUNT',
      'EMAIL_RETRY_MODIFICATION',
    ],
  },
];

// Friendly labels for config keys
const CONFIG_LABELS: Record<string, string> = {
  ALLOCATION_MULTIPLIER: 'Hệ số nhân phân bổ',
  CLAIM_TIMEOUT_MINUTES: 'Timeout claim task (phút)',
  MAX_DAILY_ALLOCATIONS: 'Phân bổ tối đa/ngày/website',
  TRAFFIC_THRESHOLD: 'Ngưỡng traffic HIGH/LOW',
  MAX_RETRY_COUNT: 'Số lần retry tối đa',
  REALLOCATION_ENABLED: 'Phân bổ bổ sung tự động',
  MAX_BATCHES_PER_REQUEST: 'Số batch tối đa/request',
  EMAIL_RETRY_MODIFICATION: 'Thêm dấu chấm email khi retry',
  REQUEST_COMPLETION_TIME_PER_100: 'Timeout request/100 entity (phút)',
};

function ConfigItem({
  config,
  onSave,
  onReset,
  isSaving,
}: {
  config: SystemConfig;
  onSave: (key: string, value: string) => void;
  onReset: (key: string) => void;
  isSaving: boolean;
}) {
  const [editValue, setEditValue] = useState(config.value);
  const hasChanged = editValue !== config.value;
  const isBoolean = config.type === 'BOOLEAN';

  const handleToggle = () => {
    const newValue = editValue === 'true' ? 'false' : 'true';
    setEditValue(newValue);
    onSave(config.key, newValue);
  };

  const handleSave = () => {
    onSave(config.key, editValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && hasChanged) {
      handleSave();
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">
            {CONFIG_LABELS[config.key] || config.key}
          </Label>
          <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {config.key}
          </code>
        </div>
        {config.description && (
          <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
        )}
        {config.updatedBy && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Updated: {new Date(config.updatedAt).toLocaleString('vi-VN')}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isBoolean ? (
          <Button
            variant={editValue === 'true' ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggle}
            disabled={isSaving}
            className="w-16"
          >
            {editValue === 'true' ? 'ON' : 'OFF'}
          </Button>
        ) : (
          <>
            <Input
              type={config.type === 'NUMBER' ? 'number' : 'text'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-32 h-8 text-sm"
              step={config.type === 'NUMBER' ? 'any' : undefined}
            />
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanged || isSaving}
              className="h-8"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onReset(config.key)}
          disabled={isSaving}
          className="h-8 px-2"
          title="Reset to default"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const { data: configs, isLoading } = useQuery({
    queryKey: ['system-configs'],
    queryFn: systemConfigApi.getAll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      systemConfigApi.update(key, value),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      toast.success(`${CONFIG_LABELS[data.key] || data.key} updated`);
      setSavingKey(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update config');
      setSavingKey(null);
    },
  });

  const resetOneMutation = useMutation({
    mutationFn: (key: string) => systemConfigApi.resetOne(key),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      toast.success(`${CONFIG_LABELS[data.key] || data.key} reset to default`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reset config');
    },
  });

  const resetAllMutation = useMutation({
    mutationFn: systemConfigApi.resetAll,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      toast.success(`Reset ${data.reset} configs to defaults`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reset configs');
    },
  });

  const handleSave = (key: string, value: string) => {
    setSavingKey(key);
    updateMutation.mutate({ key, value });
  };

  const handleReset = (key: string) => {
    resetOneMutation.mutate(key);
  };

  // Build config map for quick lookup
  const configMap = new Map<string, SystemConfig>();
  configs?.forEach((c) => configMap.set(c.key, c));

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cấu hình các thông số hệ thống monitor
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={resetAllMutation.isPending}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {resetAllMutation.isPending ? 'Resetting...' : 'Reset All Defaults'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all configs?</AlertDialogTitle>
              <AlertDialogDescription>
                Tất cả cấu hình sẽ được reset về giá trị mặc định. Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => resetAllMutation.mutate()}>
                Reset All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Config Groups */}
      {CONFIG_GROUPS.map((group) => {
        const groupConfigs = group.keys
          .map((key) => configMap.get(key))
          .filter((c): c is SystemConfig => c !== undefined);

        if (groupConfigs.length === 0) return null;

        return (
          <Card key={group.title}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {groupConfigs.map((config) => (
                <ConfigItem
                  key={config.key}
                  config={config}
                  onSave={handleSave}
                  onReset={handleReset}
                  isSaving={savingKey === config.key}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Ungrouped configs (if any new configs are added to DB but not to groups) */}
      {(() => {
        const groupedKeys = new Set(CONFIG_GROUPS.flatMap((g) => g.keys));
        const ungrouped = configs?.filter((c) => !groupedKeys.has(c.key)) || [];

        if (ungrouped.length === 0) return null;

        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Other</CardTitle>
              <CardDescription>Các cấu hình khác</CardDescription>
            </CardHeader>
            <CardContent>
              {ungrouped.map((config) => (
                <ConfigItem
                  key={config.key}
                  config={config}
                  onSave={handleSave}
                  onReset={handleReset}
                  isSaving={savingKey === config.key}
                />
              ))}
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
