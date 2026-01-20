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
import { Textarea } from '@/components/ui/textarea';
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
import { Checkbox } from '@/components/ui/checkbox';
import { proxyApi } from '@/lib/api';
import { Proxy, ProxyType, ProxyProtocol, ProxyStatus, ProxyServiceType } from '@/types';

const editProxySchema = z.object({
  ip: z.string().min(1, 'IP is required'),
  port: z.number().int().min(1, 'Port must be at least 1').max(65535, 'Port must be at most 65535'),
  username: z.string().optional(),
  password: z.string().optional(),
  type: z.nativeEnum(ProxyType),
  protocol: z.nativeEnum(ProxyProtocol),
  status: z.nativeEnum(ProxyStatus),
  services: z.array(z.nativeEnum(ProxyServiceType)),
  note: z.string().optional(),
});

type EditProxyFormValues = z.infer<typeof editProxySchema>;

interface EditProxyDialogProps {
  proxy: Proxy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SERVICE_OPTIONS = [
  { value: ProxyServiceType.ENTITY, label: 'Entity' },
  { value: ProxyServiceType.BLOG_2_0, label: 'Blog 2.0' },
  { value: ProxyServiceType.PODCAST, label: 'Podcast' },
  { value: ProxyServiceType.SOCIAL, label: 'Social' },
  { value: ProxyServiceType.GG_STACKING, label: 'GG Stacking' },
];

export function EditProxyDialog({ proxy, open, onOpenChange }: EditProxyDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<EditProxyFormValues>({
    resolver: zodResolver(editProxySchema),
    defaultValues: {
      ip: '',
      port: 8080,
      username: '',
      password: '',
      type: ProxyType.IPV4_STATIC,
      protocol: ProxyProtocol.HTTP,
      status: ProxyStatus.UNKNOWN,
      services: [],
      note: '',
    },
  });

  useEffect(() => {
    if (proxy) {
      form.reset({
        ip: proxy.ip,
        port: proxy.port,
        username: proxy.username || '',
        password: proxy.password || '',
        type: proxy.type,
        protocol: proxy.protocol,
        status: proxy.status,
        services: proxy.services || [],
        note: proxy.note || '',
      });
    }
  }, [proxy, form]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof proxyApi.update>[1] }) =>
      proxyApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxies'] });
      toast.success('Proxy updated successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update proxy');
    },
  });

  const onSubmit = (data: EditProxyFormValues) => {
    if (!proxy) return;

    updateMutation.mutate({
      id: proxy.id,
      data: {
        ip: data.ip,
        port: data.port,
        username: data.username || null,
        password: data.password || null,
        type: data.type,
        protocol: data.protocol,
        status: data.status,
        services: data.services,
        note: data.note || null,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Proxy</DialogTitle>
          <DialogDescription>
            Update the proxy information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="192.168.1.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={65535}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 8080)}
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
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input placeholder="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
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
                        <SelectItem value={ProxyType.IPV4_STATIC}>IPv4 Static</SelectItem>
                        <SelectItem value={ProxyType.IPV6_STATIC}>IPv6 Static</SelectItem>
                        <SelectItem value={ProxyType.SOCKS5}>SOCKS5</SelectItem>
                        <SelectItem value={ProxyType.ROTATING}>Rotating</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="protocol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Protocol</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select protocol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ProxyProtocol.HTTP}>HTTP</SelectItem>
                        <SelectItem value={ProxyProtocol.HTTPS}>HTTPS</SelectItem>
                        <SelectItem value={ProxyProtocol.SOCKS4}>SOCKS4</SelectItem>
                        <SelectItem value={ProxyProtocol.SOCKS5}>SOCKS5</SelectItem>
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
                        <SelectItem value={ProxyStatus.ACTIVE}>Active</SelectItem>
                        <SelectItem value={ProxyStatus.DEAD}>Dead</SelectItem>
                        <SelectItem value={ProxyStatus.CHECKING}>Checking</SelectItem>
                        <SelectItem value={ProxyStatus.UNKNOWN}>Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="services"
              render={() => (
                <FormItem>
                  <FormLabel>Services</FormLabel>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {SERVICE_OPTIONS.map((option) => (
                      <FormField
                        key={option.value}
                        control={form.control}
                        name="services"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(option.value)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, option.value]);
                                  } else {
                                    field.onChange(current.filter((v) => v !== option.value));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {option.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes..." {...field} />
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
