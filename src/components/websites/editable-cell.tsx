'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type EditableCellType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiSelect'
  | 'textarea';

export interface SelectOption {
  value: string;
  label: string;
  className?: string;
}

interface EditableCellProps {
  value: string | number | string[] | null | undefined;
  type: EditableCellType;
  options?: SelectOption[];
  onSave: (value: string | number | string[] | null) => Promise<void>;
  displayValue?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  emptyText?: string;
}

export function EditableCell({
  value,
  type,
  options = [],
  onSave,
  displayValue,
  placeholder = 'Click to edit',
  disabled = false,
  className,
  emptyText = '-',
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string | number | string[] | null>(
    value ?? null
  );
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset edit value when prop value changes
  useEffect(() => {
    setEditValue(value ?? null);
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback(() => {
    if (!disabled) {
      setIsEditing(true);
    }
  }, [disabled]);

  const handleCancel = useCallback(() => {
    setEditValue(value ?? null);
    setIsEditing(false);
  }, [value]);

  const handleSave = useCallback(async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      // Error is handled by parent, reset to original
      setEditValue(value ?? null);
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && type !== 'textarea') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [type, handleSave, handleCancel]
  );

  // Click outside to cancel (but not for select dropdowns which render in portals)
  useEffect(() => {
    if (!isEditing) return;
    // Skip click outside handling for select type since it uses portal
    if (type === 'select') return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        handleCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, handleCancel, type]);

  if (!isEditing) {
    return (
      <div
        className={cn(
          'cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 min-h-[24px] transition-colors',
          disabled && 'cursor-default hover:bg-transparent',
          className
        )}
        onDoubleClick={handleDoubleClick}
        title={disabled ? undefined : 'Double-click to edit'}
      >
        {displayValue || (value !== null && value !== undefined && value !== '' ? (
          <span>{String(value)}</span>
        ) : (
          <span className="text-muted-foreground">{emptyText}</span>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex items-center gap-1">
      {type === 'text' && (
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={String(editValue ?? '')}
          onChange={(e) => setEditValue(e.target.value || null)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-7 text-sm"
          disabled={isSaving}
        />
      )}

      {type === 'number' && (
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="number"
          value={editValue ?? ''}
          onChange={(e) =>
            setEditValue(e.target.value ? Number(e.target.value) : null)
          }
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-7 text-sm w-20"
          disabled={isSaving}
        />
      )}

      {type === 'textarea' && (
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={String(editValue ?? '')}
          onChange={(e) => setEditValue(e.target.value || null)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="text-sm min-h-[60px] resize-none"
          disabled={isSaving}
        />
      )}

      {type === 'select' && (
        <Select
          value={String(editValue ?? '')}
          onValueChange={async (v) => {
            const newValue = v || null;
            setEditValue(newValue);
            // Auto-save on select change for better UX
            if (newValue !== value) {
              setIsSaving(true);
              try {
                await onSave(newValue);
                setIsEditing(false);
              } catch {
                setEditValue(value ?? null);
              } finally {
                setIsSaving(false);
              }
            } else {
              // Same value selected, just close
              setIsEditing(false);
            }
          }}
          onOpenChange={(open) => {
            // When dropdown closes without selection, cancel edit mode
            if (!open && !isSaving) {
              handleCancel();
            }
          }}
          disabled={isSaving}
          defaultOpen={true}
        >
          <SelectTrigger className="h-7 text-sm min-w-[100px]">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {type === 'multiSelect' && (
        <div className="flex flex-wrap gap-1">
          {options.map((opt) => {
            const selected = Array.isArray(editValue)
              ? editValue.includes(opt.value)
              : false;
            return (
              <Badge
                key={opt.value}
                variant={selected ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer transition-colors',
                  selected ? '' : 'opacity-50'
                )}
                onClick={() => {
                  if (isSaving) return;
                  const currentArr = Array.isArray(editValue) ? editValue : [];
                  if (selected) {
                    setEditValue(currentArr.filter((v) => v !== opt.value));
                  } else {
                    setEditValue([...currentArr, opt.value]);
                  }
                }}
              >
                {opt.label}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Hide save/cancel buttons for select type since it auto-saves */}
      {type !== 'select' && (
        <div className="flex items-center gap-0.5 ml-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3 text-green-600" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      )}
      {/* Show loading spinner for select type when saving */}
      {type === 'select' && isSaving && (
        <Loader2 className="h-4 w-4 animate-spin ml-1" />
      )}
    </div>
  );
}
