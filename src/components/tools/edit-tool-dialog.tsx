'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toolApi } from '@/lib/api';
import { Tool, ToolType, ToolStatus, ToolService } from '@/types';

const editToolSchema = z.object({
  idTool: z.string().min(1, 'Tool ID is required'),
  threadNumber: z.number().int().min(1, 'Must be at least 1'),
  type: z.nativeEnum(ToolType),
  status: z.nativeEnum(ToolStatus),
  service: z.nativeEnum(ToolService),
  estimateTime: z.number().int().min(0).optional(),
  customerType: z.string().optional(),
});

type EditToolFormValues = z.infer<typeof editToolSchema>;

interface EditToolDialogProps {
  tool: Tool | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditToolDialog({ tool, open, onOpenChange }: EditToolDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<EditToolFormValues>({
    resolver: zodResolver(editToolSchema),
    defaultValues: {
      idTool: '',
      threadNumber: 1,
      type: ToolType.INDIVIDUAL,
      status: ToolStatus.RUNNING,
      service: ToolService.ENTITY,
      estimateTime: undefined,
      customerType: '',
    },
  });

  useEffect(() => {
    if (tool) {
      form.reset({
        idTool: tool.idTool,
        threadNumber: tool.threadNumber,
        type: tool.type,
        status: tool.status,
        service: tool.service,
        estimateTime: tool.estimateTime || undefined,
        customerType: tool.customerType || '',
      });
    }
  }, [tool, form]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof toolApi.update>[1] }) =>
      toolApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      toast.success('Tool updated successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update tool');
    },
  });

  const onSubmit = (data: EditToolFormValues) => {
    if (!tool) return;

    updateMutation.mutate({
      id: tool.id,
      data: {
        idTool: data.idTool,
        threadNumber: data.threadNumber,
        type: data.type,
        status: data.status,
        service: data.service,
        estimateTime: data.estimateTime || null,
        customerType: data.customerType || null,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Tool</DialogTitle>
          <DialogDescription>
            Update the automation tool information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="idTool"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tool ID *</FormLabel>
                  <FormControl>
                    <Input placeholder="TOOL-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="threadNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thread Number</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimate Time (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="30"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? e.target.valueAsNumber : undefined)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ToolType.INDIVIDUAL}>Individual</SelectItem>
                        <SelectItem value={ToolType.GLOBAL}>Global</SelectItem>
                        <SelectItem value={ToolType.CANCEL}>Cancel</SelectItem>
                        <SelectItem value={ToolType.RE_RUNNING}>Re-running</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ToolStatus.RUNNING}>Running</SelectItem>
                        <SelectItem value={ToolStatus.DIE}>Die</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="service"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={ToolService.ENTITY}>Entity</SelectItem>
                      <SelectItem value={ToolService.SOCIAL}>Social</SelectItem>
                      <SelectItem value={ToolService.INDEX}>Index</SelectItem>
                      <SelectItem value={ToolService.GOOGLE_STACKING}>Google Stacking</SelectItem>
                      <SelectItem value={ToolService.BLOG}>Blog</SelectItem>
                      <SelectItem value={ToolService.PODCAST}>Podcast</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Type</FormLabel>
                  <FormControl>
                    <Input placeholder="Premium, Standard, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
