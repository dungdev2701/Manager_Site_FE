'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { websiteApi } from '@/lib/api';
import { Website, WebsiteStatus, WebsiteType, WebsiteMetrics } from '@/types';

const editWebsiteSchema = z.object({
  type: z.nativeEnum(WebsiteType),
  status: z.nativeEnum(WebsiteStatus),
  notes: z.string().max(5000).optional(),
  // Metrics fields - use string for form input, convert when submitting
  traffic: z.string().optional(),
  DA: z.string().optional(),
  captcha_type: z.string().optional(),
  captcha_provider: z.string().optional(), // Only when captcha_type = 'captcha'
  cloudflare: z.string().optional(), // Only when captcha_type = 'normal'
  index: z.string().optional(),
  username: z.string().optional(), // Username allows numbers or not
  email: z.string().optional(),
  required_gmail: z.string().optional(),
  verify: z.string().optional(),
  about: z.string().optional(),
  about_max_chars: z.string().optional(), // Max characters allowed for about
  text_link: z.string().optional(),
  social_connect: z.array(z.enum(['facebook', 'twitter', 'youtube', 'linkedin'])).optional(),
  avatar: z.string().optional(),
  cover: z.string().optional(),
});

type EditWebsiteFormValues = z.infer<typeof editWebsiteSchema>;

interface EditWebsiteDialogProps {
  website: Website | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOCIAL_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
] as const;

const STATUS_OPTIONS = [
  { value: WebsiteStatus.NEW, label: 'New' },
  { value: WebsiteStatus.CHECKING, label: 'Checking' },
  { value: WebsiteStatus.HANDING, label: 'Handing' },
  { value: WebsiteStatus.PENDING, label: 'Pending' },
  { value: WebsiteStatus.RUNNING, label: 'Running' },
  { value: WebsiteStatus.ERROR, label: 'Error' },
  { value: WebsiteStatus.MAINTENANCE, label: 'Maintenance' },
];

const TYPE_OPTIONS = [
  { value: WebsiteType.ENTITY, label: 'Entity' },
  { value: WebsiteType.BLOG2, label: 'Blog 2.0' },
  { value: WebsiteType.PODCAST, label: 'Podcast' },
  { value: WebsiteType.SOCIAL, label: 'Social' },
];

export function EditWebsiteDialog({
  website,
  open,
  onOpenChange,
}: EditWebsiteDialogProps) {
  const [showMetrics, setShowMetrics] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<EditWebsiteFormValues>({
    resolver: zodResolver(editWebsiteSchema),
    defaultValues: {
      type: WebsiteType.ENTITY,
      status: WebsiteStatus.NEW,
      notes: '',
      social_connect: [],
    },
  });

  // Reset form when website changes
  useEffect(() => {
    if (website) {
      const metrics = website.metrics;
      form.reset({
        type: website.type,
        status: website.status,
        notes: website.notes || '',
        traffic: metrics?.traffic?.toString() || '',
        DA: metrics?.DA?.toString() || '',
        captcha_type: metrics?.captcha_type || '',
        captcha_provider: metrics?.captcha_provider || '',
        cloudflare: metrics?.cloudflare !== undefined ? (metrics.cloudflare ? 'yes' : 'no') : '',
        index: metrics?.index || '',
        username: metrics?.username || '',
        email: metrics?.email || '',
        required_gmail: metrics?.required_gmail || '',
        verify: metrics?.verify || '',
        about: metrics?.about || '',
        about_max_chars: metrics?.about_max_chars?.toString() || '',
        text_link: metrics?.text_link || '',
        social_connect: metrics?.social_connect || [],
        avatar: metrics?.avatar || '',
        cover: metrics?.cover || '',
      });
      // Auto expand metrics if website has metrics
      if (metrics && Object.keys(metrics).length > 0) {
        setShowMetrics(true);
      }
    }
  }, [website, form]);

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: Parameters<typeof websiteApi.update>[1] }) =>
      websiteApi.update(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      toast.success('Website updated successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update website');
    },
  });

  const onSubmit = (data: EditWebsiteFormValues) => {
    if (!website) return;

    const metrics: WebsiteMetrics = {};

    // Convert string to number for traffic and DA
    if (data.traffic && data.traffic !== '') {
      const trafficNum = parseInt(data.traffic, 10);
      if (!isNaN(trafficNum) && trafficNum >= 0) metrics.traffic = trafficNum;
    }
    if (data.DA && data.DA !== '') {
      const daNum = parseInt(data.DA, 10);
      if (!isNaN(daNum) && daNum >= 0 && daNum <= 100) metrics.DA = daNum;
    }
    if (data.captcha_type && data.captcha_type !== '') {
      metrics.captcha_type = data.captcha_type as 'captcha' | 'normal';
      // Only save captcha_provider if captcha_type is 'captcha'
      if (data.captcha_type === 'captcha' && data.captcha_provider && data.captcha_provider !== '') {
        metrics.captcha_provider = data.captcha_provider as 'recaptcha' | 'hcaptcha';
      }
      // Only save cloudflare if captcha_type is 'normal'
      if (data.captcha_type === 'normal' && data.cloudflare && data.cloudflare !== '') {
        metrics.cloudflare = data.cloudflare === 'yes';
      }
    }
    if (data.index && data.index !== '') metrics.index = data.index as 'yes' | 'no';
    if (data.username && data.username !== '') metrics.username = data.username as 'unique' | 'duplicate' | 'no';
    if (data.email && data.email !== '') metrics.email = data.email as 'multi' | 'no_multi';
    if (data.required_gmail && data.required_gmail !== '') metrics.required_gmail = data.required_gmail as 'yes' | 'no';
    if (data.verify && data.verify !== '') metrics.verify = data.verify as 'yes' | 'no';
    if (data.about && data.about !== '') metrics.about = data.about as 'no_stacking' | 'stacking_post' | 'stacking_about' | 'long_about';
    if (data.about_max_chars && data.about_max_chars !== '') {
      const maxCharsNum = parseInt(data.about_max_chars, 10);
      if (!isNaN(maxCharsNum) && maxCharsNum > 0) metrics.about_max_chars = maxCharsNum;
    }
    if (data.text_link && data.text_link !== '') metrics.text_link = data.text_link as 'no' | 'href' | 'markdown' | 'BBCode';
    if (data.social_connect && data.social_connect.length > 0) metrics.social_connect = data.social_connect;
    if (data.avatar && data.avatar !== '') metrics.avatar = data.avatar as 'yes' | 'no';
    if (data.cover && data.cover !== '') metrics.cover = data.cover as 'yes' | 'no';

    updateMutation.mutate({
      id: website.id,
      payload: {
        type: data.type,
        status: data.status,
        notes: data.notes,
        metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
      },
    });
  };

  const socialConnect = form.watch('social_connect') || [];

  if (!website) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Website</DialogTitle>
          <DialogDescription>
            Update website information for <span className="font-semibold">{website.domain}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type & Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
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
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about this website..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Collapsible Metrics Section */}
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setShowMetrics(!showMetrics)}
                className="flex items-center justify-between w-full p-3 text-sm font-medium hover:bg-muted/50 rounded-lg"
              >
                <span>Metrics</span>
                {showMetrics ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showMetrics && (
                <div className="p-4 pt-0 space-y-4">
                  {/* Row 1: Traffic & DA */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="traffic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Traffic</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g. 5000"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="DA"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>DA (0-100)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              placeholder="e.g. 25"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row 2: Captcha Type & Conditional Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="captcha_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Captcha Type</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Reset conditional fields when captcha_type changes
                              form.setValue('captcha_provider', '');
                              form.setValue('cloudflare', '');
                            }}
                            value={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="captcha">Captcha</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Show Captcha Provider if captcha_type is 'captcha' */}
                    {form.watch('captcha_type') === 'captcha' && (
                      <FormField
                        control={form.control}
                        name="captcha_provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Captcha Provider</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="recaptcha">ReCaptcha</SelectItem>
                                <SelectItem value="hcaptcha">hCaptcha</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Show Cloudflare if captcha_type is 'normal' */}
                    {form.watch('captcha_type') === 'normal' && (
                      <FormField
                        control={form.control}
                        name="cloudflare"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cloudflare</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Show Index if captcha_type is not selected */}
                    {!form.watch('captcha_type') && (
                      <FormField
                        control={form.control}
                        name="index"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Index</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Row 2.5: Index & Email */}
                  <div className="grid grid-cols-2 gap-4">
                    {form.watch('captcha_type') && (
                      <FormField
                        control={form.control}
                        name="index"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Index</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="multi">Multi</SelectItem>
                              <SelectItem value="no_multi">No Multi</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row: Username & Required Gmail */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unique">Unique</SelectItem>
                              <SelectItem value="duplicate">Duplicate</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="required_gmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Required Gmail</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row: Verify */}
                  <FormField
                    control={form.control}
                    name="verify"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verify</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Row 4: About & Max Chars */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="about"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>About</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="no_stacking">No Stacking</SelectItem>
                              <SelectItem value="stacking_post">Stacking Post</SelectItem>
                              <SelectItem value="stacking_about">Stacking About</SelectItem>
                              <SelectItem value="long_about">Long About</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="about_max_chars"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Characters</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g. 500"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row 4.5: Text Link */}
                  <FormField
                    control={form.control}
                    name="text_link"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text Link</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="href">Href</SelectItem>
                            <SelectItem value="markdown">Markdown</SelectItem>
                            <SelectItem value="BBCode">BBCode</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Row 5: Social Connect */}
                  <FormField
                    control={form.control}
                    name="social_connect"
                    render={() => (
                      <FormItem>
                        <FormLabel>Social Connect</FormLabel>
                        <div className="flex flex-wrap gap-4">
                          {SOCIAL_OPTIONS.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-${option.value}`}
                                checked={socialConnect.includes(option.value)}
                                onCheckedChange={(checked) => {
                                  const current = form.getValues('social_connect') || [];
                                  if (checked) {
                                    form.setValue('social_connect', [...current, option.value]);
                                  } else {
                                    form.setValue(
                                      'social_connect',
                                      current.filter((v) => v !== option.value)
                                    );
                                  }
                                }}
                              />
                              <label
                                htmlFor={`edit-${option.value}`}
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Row 6: Avatar & Cover */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="avatar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avatar</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cover"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cover</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

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
