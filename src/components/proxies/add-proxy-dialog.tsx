'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
  FormDescription,
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
import { ProxyType, ProxyProtocol, ProxyServiceType } from '@/types';

const addProxySchema = z.object({
  proxies: z.string().min(1, 'Please enter at least one proxy'),
  type: z.nativeEnum(ProxyType),
  protocol: z.nativeEnum(ProxyProtocol),
  services: z.array(z.nativeEnum(ProxyServiceType)),
});

type AddProxyFormValues = z.infer<typeof addProxySchema>;

interface AddProxyDialogProps {
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

export function AddProxyDialog({ open, onOpenChange }: AddProxyDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<AddProxyFormValues>({
    resolver: zodResolver(addProxySchema),
    defaultValues: {
      proxies: '',
      type: ProxyType.IPV4_STATIC,
      protocol: ProxyProtocol.HTTP,
      services: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: proxyApi.bulkCreate,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proxies'] });
      const messages = [];
      if (result.created > 0) messages.push(`Created ${result.created} proxies`);
      if (result.duplicates > 0) messages.push(`${result.duplicates} duplicates skipped`);
      if (result.errors.length > 0) messages.push(`${result.errors.length} errors`);
      toast.success(messages.join(', '));
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create proxies');
    },
  });

  const onSubmit = (data: AddProxyFormValues) => {
    createMutation.mutate({
      proxies: data.proxies,
      type: data.type,
      protocol: data.protocol,
      services: data.services,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Proxies</DialogTitle>
          <DialogDescription>
            Add proxies in bulk. One proxy per line with format: IP:PORT:USERNAME:PASSWORD
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="proxies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proxy List *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="216.74.114.208:6491:username:password&#10;192.186.186.161:6203:username:password&#10;..."
                      className="min-h-[200px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Format: IP:PORT:USERNAME:PASSWORD (one per line). Username and password are optional.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proxy Type</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="services"
              render={() => (
                <FormItem>
                  <FormLabel>Services</FormLabel>
                  <FormDescription>
                    Select which services these proxies will be used for
                  </FormDescription>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Proxies
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
