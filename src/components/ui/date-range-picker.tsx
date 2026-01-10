'use client';

import * as React from 'react';
import { format, subDays, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
  disabled?: boolean;
}

const presets = [
  { value: 'today', label: 'Hôm nay', days: 0 },
  { value: 'yesterday', label: 'Hôm qua', days: 1 },
  { value: '7', label: '7 ngày', days: 7 },
  { value: '14', label: '14 ngày', days: 14 },
  { value: '30', label: '30 ngày', days: 30 },
  { value: '60', label: '60 ngày', days: 60 },
  { value: '90', label: '90 ngày', days: 90 },
  { value: 'custom', label: 'Tùy chọn', days: -1 },
];

export function DateRangePicker({
  value,
  onChange,
  className,
  disabled = false,
}: DateRangePickerProps) {
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  // Detect current preset from value
  const currentPreset = React.useMemo(() => {
    if (!value?.from || !value?.to) return '30';

    const today = new Date();
    const todayStart = startOfDay(today);
    const fromStart = startOfDay(value.from);
    const toStart = startOfDay(value.to);

    // Check if it's today
    if (fromStart.getTime() === todayStart.getTime() && toStart.getTime() === todayStart.getTime()) {
      return 'today';
    }

    // Check if it's yesterday
    const yesterdayStart = startOfDay(subDays(today, 1));
    if (fromStart.getTime() === yesterdayStart.getTime() && toStart.getTime() === yesterdayStart.getTime()) {
      return 'yesterday';
    }

    // Check if end date is today
    if (toStart.getTime() === todayStart.getTime()) {
      const days = differenceInDays(toStart, fromStart) + 1;
      const matchingPreset = presets.find(p => p.days === days);
      if (matchingPreset) return matchingPreset.value;
    }

    return 'custom';
  }, [value]);

  const handlePresetChange = (presetValue: string) => {
    if (presetValue === 'custom') {
      setCalendarOpen(true);
      return;
    }

    const preset = presets.find(p => p.value === presetValue);
    if (!preset) return;

    const today = new Date();
    if (preset.days === 0) {
      // Hôm nay
      onChange?.({
        from: startOfDay(today),
        to: endOfDay(today),
      });
    } else if (preset.days === 1) {
      // Hôm qua
      const yesterday = subDays(today, 1);
      onChange?.({
        from: startOfDay(yesterday),
        to: endOfDay(yesterday),
      });
    } else {
      // X ngày qua
      onChange?.({
        from: startOfDay(subDays(today, preset.days - 1)),
        to: endOfDay(today),
      });
    }
  };

  const formatCustomDate = () => {
    if (!value?.from) return 'Tùy chọn';

    const fromDate = format(value.from, 'dd/MM/yyyy', { locale: vi });
    if (value.to) {
      const toDate = format(value.to, 'dd/MM/yyyy', { locale: vi });
      if (fromDate === toDate) return fromDate;
      return `${fromDate} - ${toDate}`;
    }
    return fromDate;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Preset Select */}
      <Select
        value={currentPreset}
        onValueChange={handlePresetChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[130px] bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.value === 'custom' && currentPreset === 'custom'
                ? formatCustomDate()
                : preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Calendar Popover */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={disabled}
            className="shrink-0"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={(range) => {
              onChange?.(range);
              // Close popover when both dates are selected
              if (range?.from && range?.to) {
                setCalendarOpen(false);
              }
            }}
            numberOfMonths={1}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface SingleDatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
  disabled?: boolean;
  disableFuture?: boolean;
}

export function SingleDatePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày',
  className,
  align = 'start',
  disabled = false,
  disableFuture = true,
}: SingleDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'dd/MM/yyyy', { locale: vi }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
          disabled={disableFuture ? { after: new Date() } : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
