'use client';

import { useEffect, useRef } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
import { Separator } from '@/components/ui/separator';
import { serviceRequestApi } from '@/lib/api';
import { ServiceType, DomainSelection } from '@/types';

// ==================== Config Zod Schemas (mirror backend) ====================

const entityConfigSchema = z.object({
  email: z.string().email('Invalid email').max(125),
  appPassword: z.string().max(55).min(1, 'Required'),
  username: z.string().max(55).min(1, 'Required'),
  entityLimit: z.number().int().min(1),
  website: z.string().max(500).min(1, 'Required'),
  fixedSites: z.string().optional().nullable(),
  accountType: z.enum(['multiple', 'once']).default('multiple'),
  spinContent: z.enum(['always', 'never']).default('always'),
  entityConnect: z.string().min(1, 'Required'),
  socialConnect: z.string().optional().nullable(),
  firstName: z.string().max(25).min(1, 'Required'),
  lastName: z.string().max(25).min(1, 'Required'),
  about: z.string().min(1, 'Required'),
  address: z.string().max(200).min(1, 'Required'),
  phone: z.string().max(20).min(1, 'Required'),
  location: z.string().max(100).min(1, 'Required'),
  avatar: z.string().max(500).optional().nullable(),
  cover: z.string().max(500).optional().nullable(),
});

const blog2ConfigSchema = z.object({
  blogGroupId: z.string().optional().nullable(),
  typeRequest: z.enum(['post', 'register']).default('post'),
  target: z.number().int().min(0).default(0),
  data: z.string().optional().nullable(),
});

const socialContentAISchema = z.object({
  contentType: z.literal('AI'),
  language: z.string().max(50).min(1, 'Required'),
  keyword: z.string().min(1, 'Required'),
  image_link: z.string().optional().nullable(),
});

const socialContentManualSchema = z.object({
  contentType: z.literal('manual'),
  image_link: z.string().optional().nullable(),
  title: z.string().min(1, 'Required'),
  content: z.string().min(1, 'Required'),
});

const socialConfigSchema = z.object({
  socialGroupId: z.string().optional().nullable(),
  website: z.string().max(500).min(1, 'Required'),
  percentage: z.number().min(0).max(100).default(100),
  unique_url: z.boolean().default(true),
  email_report: z.boolean().default(true),
  share_code: z.boolean().default(true),
  auction_price: z.number().min(0).default(0),
  data: z.discriminatedUnion('contentType', [
    socialContentAISchema,
    socialContentManualSchema,
  ]),
});

const podcastConfigSchema = z.object({
  podcastGroupId: z.string().optional().nullable(),
  typeRequest: z.enum(['post', 'register']).default('post'),
  target: z.number().int().min(0).default(0),
  data: z.string().optional().nullable(),
});

const ggStackingConfigSchema = z.object({
  folderUrl: z.string().optional().nullable(),
  title: z.string().max(500).min(1, 'Required'),
  website: z.string().max(255).min(1, 'Required'),
  about: z.string().min(1, 'Required'),
  phone: z.string().max(20).min(1, 'Required'),
  address: z.string().max(200).min(1, 'Required'),
  location: z.string().max(100).min(1, 'Required'),
  stackingConnect: z.string().optional().nullable(),
  spinContent: z.enum(['always', 'never']).default('always'),
  duplicate: z.number().int().min(0).default(0),
});

// ==================== Main Form Schema ====================

const createRequestSchema = z.object({
  serviceType: z.nativeEnum(ServiceType),
  externalUserId: z.string().min(1, 'External User ID is required'),
  externalUserEmail: z.string().email().optional().or(z.literal('')),
  externalUserName: z.string().optional(),
  name: z.string().max(255).optional(),
  domains: z.nativeEnum(DomainSelection),
  auctionPrice: z.number().min(0).optional(),
  target: z.string().optional(),
  typeRequest: z.string().max(50).optional(),
  externalId: z.string().optional(),
  serviceGroupId: z.string().optional(),
  assignedUserId: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
}).superRefine((data, ctx) => {
  if (data.config && Object.keys(data.config).length > 0) {
    let result;
    switch (data.serviceType) {
      case ServiceType.ENTITY:
        result = entityConfigSchema.safeParse(data.config);
        break;
      case ServiceType.BLOG2:
        result = blog2ConfigSchema.safeParse(data.config);
        break;
      case ServiceType.SOCIAL:
        result = socialConfigSchema.safeParse(data.config);
        break;
      case ServiceType.PODCAST:
        result = podcastConfigSchema.safeParse(data.config);
        break;
      case ServiceType.GG_STACKING:
        result = ggStackingConfigSchema.safeParse(data.config);
        break;
    }
    if (result && !result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({
          ...issue,
          path: ['config', ...issue.path],
        });
      });
    }
  }
});

type CreateRequestFormValues = z.infer<typeof createRequestSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormAny = UseFormReturn<any>;

// ==================== Default Config per Service Type ====================

function getDefaultConfig(serviceType: ServiceType): Record<string, unknown> {
  switch (serviceType) {
    case ServiceType.ENTITY:
      return {
        email: '', appPassword: '', username: '', entityLimit: 1,
        website: '', fixedSites: '', accountType: 'multiple',
        spinContent: 'always', entityConnect: '', socialConnect: '',
        firstName: '', lastName: '', about: '', address: '',
        phone: '', location: '', avatar: '', cover: '',
      };
    case ServiceType.BLOG2:
      return {
        blogGroupId: '', typeRequest: 'post', target: 0, data: '',
      };
    case ServiceType.SOCIAL:
      return {
        socialGroupId: '', website: '', percentage: 100,
        unique_url: true, email_report: true, share_code: true,
        auction_price: 0,
        data: { contentType: 'AI', language: '', keyword: '', image_link: '' },
      };
    case ServiceType.PODCAST:
      return {
        podcastGroupId: '', typeRequest: 'post', target: 0, data: '',
      };
    case ServiceType.GG_STACKING:
      return {
        folderUrl: '', title: '', website: '', about: '',
        phone: '', address: '', location: '', stackingConnect: '',
        spinContent: 'always', duplicate: 0,
      };
  }
}

// ==================== Service Type Labels ====================

const serviceTypeLabels: Record<ServiceType, string> = {
  [ServiceType.ENTITY]: 'Entity',
  [ServiceType.BLOG2]: 'Blog 2.0',
  [ServiceType.PODCAST]: 'Podcast',
  [ServiceType.SOCIAL]: 'Social',
  [ServiceType.GG_STACKING]: 'GG Stacking',
};

// ==================== Config Field Components ====================

function EntityConfigFields({ form }: { form: FormAny }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Entity Config</h4>
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="config.email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email *</FormLabel>
            <FormControl><Input type="email" placeholder="email@example.com" {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="config.appPassword" render={({ field }) => (
          <FormItem>
            <FormLabel>App Password *</FormLabel>
            <FormControl><Input type="password" {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="config.username" render={({ field }) => (
          <FormItem>
            <FormLabel>Username *</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="config.entityLimit" render={({ field }) => (
          <FormItem>
            <FormLabel>Entity Limit *</FormLabel>
            <FormControl>
              <Input type="number" min={1} {...field} value={field.value ?? 1}
                onChange={(e) => field.onChange(e.target.valueAsNumber || 1)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <FormField control={form.control} name="config.website" render={({ field }) => (
        <FormItem>
          <FormLabel>Website *</FormLabel>
          <FormControl><Input placeholder="https://example.com" {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="config.fixedSites" render={({ field }) => (
        <FormItem>
          <FormLabel>Fixed Sites</FormLabel>
          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="config.accountType" render={({ field }) => (
          <FormItem>
            <FormLabel>Account Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? 'multiple'}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="multiple">Multiple</SelectItem>
                <SelectItem value="once">Once</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="config.spinContent" render={({ field }) => (
          <FormItem>
            <FormLabel>Spin Content</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? 'always'}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="always">Always</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <FormField control={form.control} name="config.entityConnect" render={({ field }) => (
        <FormItem>
          <FormLabel>Entity Connect *</FormLabel>
          <FormControl><Textarea rows={2} {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="config.socialConnect" render={({ field }) => (
        <FormItem>
          <FormLabel>Social Connect</FormLabel>
          <FormControl><Textarea rows={2} {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="config.firstName" render={({ field }) => (
          <FormItem>
            <FormLabel>First Name *</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="config.lastName" render={({ field }) => (
          <FormItem>
            <FormLabel>Last Name *</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <FormField control={form.control} name="config.about" render={({ field }) => (
        <FormItem>
          <FormLabel>About *</FormLabel>
          <FormControl><Textarea rows={3} {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="config.address" render={({ field }) => (
          <FormItem>
            <FormLabel>Address *</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="config.phone" render={({ field }) => (
          <FormItem>
            <FormLabel>Phone *</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <FormField control={form.control} name="config.location" render={({ field }) => (
        <FormItem>
          <FormLabel>Location *</FormLabel>
          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="config.avatar" render={({ field }) => (
          <FormItem>
            <FormLabel>Avatar URL</FormLabel>
            <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="config.cover" render={({ field }) => (
          <FormItem>
            <FormLabel>Cover URL</FormLabel>
            <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </div>
  );
}

function Blog2ConfigFields({ form }: { form: FormAny }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Blog 2.0 Config</h4>
      <FormField control={form.control} name="config.blogGroupId" render={({ field }) => (
        <FormItem>
          <FormLabel>Blog Group ID</FormLabel>
          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="config.typeRequest" render={({ field }) => (
          <FormItem>
            <FormLabel>Type Request</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? 'post'}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="post">Post</SelectItem>
                <SelectItem value="register">Register</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="config.target" render={({ field }) => (
          <FormItem>
            <FormLabel>Target</FormLabel>
            <FormControl>
              <Input type="number" min={0} {...field} value={field.value ?? 0}
                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <FormField control={form.control} name="config.data" render={({ field }) => (
        <FormItem>
          <FormLabel>Data</FormLabel>
          <FormControl><Textarea rows={3} placeholder="Additional data..." {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  );
}

function SocialConfigFields({ form }: { form: FormAny }) {
  const contentType = form.watch('config.data.contentType');

  const handleContentTypeChange = (newType: string) => {
    if (newType === 'AI') {
      form.setValue('config.data', {
        contentType: 'AI', language: '', keyword: '', image_link: '',
      });
    } else {
      form.setValue('config.data', {
        contentType: 'manual', image_link: '', title: '', content: '',
      });
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Social Config</h4>
      <FormField control={form.control} name="config.socialGroupId" render={({ field }) => (
        <FormItem>
          <FormLabel>Social Group ID</FormLabel>
          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="config.website" render={({ field }) => (
        <FormItem>
          <FormLabel>Website *</FormLabel>
          <FormControl><Input placeholder="https://example.com" {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="config.percentage" render={({ field }) => (
          <FormItem>
            <FormLabel>Percentage (0-100)</FormLabel>
            <FormControl>
              <Input type="number" min={0} max={100} {...field} value={field.value ?? 100}
                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="config.auction_price" render={({ field }) => (
          <FormItem>
            <FormLabel>Auction Price</FormLabel>
            <FormControl>
              <Input type="number" min={0} {...field} value={field.value ?? 0}
                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <div className="flex flex-wrap gap-6">
        <FormField control={form.control} name="config.unique_url" render={({ field }) => (
          <FormItem className="flex items-center gap-2 space-y-0">
            <FormControl>
              <Checkbox checked={field.value ?? true} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="font-normal">Unique URL</FormLabel>
          </FormItem>
        )} />
        <FormField control={form.control} name="config.email_report" render={({ field }) => (
          <FormItem className="flex items-center gap-2 space-y-0">
            <FormControl>
              <Checkbox checked={field.value ?? true} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="font-normal">Email Report</FormLabel>
          </FormItem>
        )} />
        <FormField control={form.control} name="config.share_code" render={({ field }) => (
          <FormItem className="flex items-center gap-2 space-y-0">
            <FormControl>
              <Checkbox checked={field.value ?? true} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="font-normal">Share Code</FormLabel>
          </FormItem>
        )} />
      </div>

      <Separator />
      <h4 className="text-sm font-semibold">Content Data</h4>

      <div className="space-y-4">
        <FormItem>
          <FormLabel>Content Type</FormLabel>
          <Select value={contentType ?? 'AI'} onValueChange={handleContentTypeChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="AI">AI Generated</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>

        {contentType === 'AI' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="config.data.language" render={({ field }) => (
                <FormItem>
                  <FormLabel>Language *</FormLabel>
                  <FormControl><Input placeholder="Vietnamese" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="config.data.image_link" render={({ field }) => (
                <FormItem>
                  <FormLabel>Image Link</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="config.data.keyword" render={({ field }) => (
              <FormItem>
                <FormLabel>Keyword *</FormLabel>
                <FormControl><Textarea rows={2} placeholder="seo, top seo, ..." {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </>
        )}

        {contentType === 'manual' && (
          <>
            <FormField control={form.control} name="config.data.image_link" render={({ field }) => (
              <FormItem>
                <FormLabel>Image Link</FormLabel>
                <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="config.data.title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="config.data.content" render={({ field }) => (
              <FormItem>
                <FormLabel>Content *</FormLabel>
                <FormControl><Textarea rows={4} {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </>
        )}
      </div>
    </div>
  );
}

function PodcastConfigFields({ form }: { form: FormAny }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Podcast Config</h4>
      <FormField control={form.control} name="config.podcastGroupId" render={({ field }) => (
        <FormItem>
          <FormLabel>Podcast Group ID</FormLabel>
          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="config.typeRequest" render={({ field }) => (
          <FormItem>
            <FormLabel>Type Request</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? 'post'}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="post">Post</SelectItem>
                <SelectItem value="register">Register</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="config.target" render={({ field }) => (
          <FormItem>
            <FormLabel>Target</FormLabel>
            <FormControl>
              <Input type="number" min={0} {...field} value={field.value ?? 0}
                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <FormField control={form.control} name="config.data" render={({ field }) => (
        <FormItem>
          <FormLabel>Data</FormLabel>
          <FormControl><Textarea rows={3} placeholder="Additional data..." {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  );
}

function GGStackingConfigFields({ form }: { form: FormAny }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">GG Stacking Config</h4>
      <FormField control={form.control} name="config.folderUrl" render={({ field }) => (
        <FormItem>
          <FormLabel>Folder URL</FormLabel>
          <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="config.title" render={({ field }) => (
        <FormItem>
          <FormLabel>Title *</FormLabel>
          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="config.website" render={({ field }) => (
        <FormItem>
          <FormLabel>Website *</FormLabel>
          <FormControl><Input placeholder="https://example.com" {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="config.about" render={({ field }) => (
        <FormItem>
          <FormLabel>About *</FormLabel>
          <FormControl><Textarea rows={3} {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="config.phone" render={({ field }) => (
          <FormItem>
            <FormLabel>Phone *</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="config.address" render={({ field }) => (
          <FormItem>
            <FormLabel>Address *</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <FormField control={form.control} name="config.location" render={({ field }) => (
        <FormItem>
          <FormLabel>Location *</FormLabel>
          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="config.stackingConnect" render={({ field }) => (
        <FormItem>
          <FormLabel>Stacking Connect</FormLabel>
          <FormControl><Textarea rows={2} {...field} value={field.value ?? ''} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="config.spinContent" render={({ field }) => (
          <FormItem>
            <FormLabel>Spin Content</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? 'always'}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="always">Always</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="config.duplicate" render={({ field }) => (
          <FormItem>
            <FormLabel>Duplicate</FormLabel>
            <FormControl>
              <Input type="number" min={0} {...field} value={field.value ?? 0}
                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </div>
  );
}

// ==================== Main Dialog Component ====================

interface CreateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRequestDialog({ open, onOpenChange }: CreateRequestDialogProps) {
  const queryClient = useQueryClient();
  const prevServiceTypeRef = useRef<ServiceType | null>(null);

  const form = useForm<CreateRequestFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createRequestSchema) as any,
    defaultValues: {
      serviceType: ServiceType.ENTITY,
      externalUserId: '',
      externalUserEmail: '',
      externalUserName: '',
      name: '',
      domains: DomainSelection.LIKEPION,
      auctionPrice: undefined,
      target: '',
      typeRequest: '',
      externalId: '',
      serviceGroupId: '',
      assignedUserId: '',
      config: getDefaultConfig(ServiceType.ENTITY),
    },
  });

  const watchedServiceType = form.watch('serviceType');

  useEffect(() => {
    if (prevServiceTypeRef.current !== null && prevServiceTypeRef.current !== watchedServiceType) {
      form.setValue('config', getDefaultConfig(watchedServiceType), { shouldValidate: false });
    }
    prevServiceTypeRef.current = watchedServiceType;
  }, [watchedServiceType, form]);

  const createMutation = useMutation({
    mutationFn: serviceRequestApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      toast.success('Service request created successfully');
      form.reset();
      prevServiceTypeRef.current = null;
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create service request');
    },
  });

  const onSubmit = (data: CreateRequestFormValues) => {
    // Clean up empty strings to undefined/null
    const payload: Record<string, unknown> = {
      serviceType: data.serviceType,
      externalUserId: data.externalUserId,
      domains: data.domains,
      config: data.config,
    };
    if (data.externalUserEmail) payload.externalUserEmail = data.externalUserEmail;
    if (data.externalUserName) payload.externalUserName = data.externalUserName;
    if (data.name) payload.name = data.name;
    if (data.auctionPrice !== undefined) payload.auctionPrice = data.auctionPrice;
    if (data.target) payload.target = data.target;
    if (data.typeRequest) payload.typeRequest = data.typeRequest;
    if (data.externalId) payload.externalId = data.externalId;
    if (data.serviceGroupId) payload.serviceGroupId = data.serviceGroupId;
    if (data.assignedUserId) payload.assignedUserId = data.assignedUserId;

    createMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Service Request</DialogTitle>
          <DialogDescription>
            Create a new service request. Select a service type to see its specific config fields.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Service Type */}
            <FormField control={form.control} name="serviceType" render={({ field }) => (
              <FormItem>
                <FormLabel>Service Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select service type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.values(ServiceType).map((type) => (
                      <SelectItem key={type} value={type}>{serviceTypeLabels[type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Base Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="externalUserId" render={({ field }) => (
                <FormItem>
                  <FormLabel>External User ID *</FormLabel>
                  <FormControl><Input placeholder="User ID from KH system" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="externalUserEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>External User Email</FormLabel>
                  <FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="externalUserName" render={({ field }) => (
                <FormItem>
                  <FormLabel>External User Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Name</FormLabel>
                  <FormControl><Input placeholder="Request name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="domains" render={({ field }) => (
                <FormItem>
                  <FormLabel>Domains</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.values(DomainSelection).map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="auctionPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Auction Price</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? e.target.valueAsNumber : undefined)}
                      onBlur={field.onBlur} name={field.name} ref={field.ref} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="target" render={({ field }) => (
                <FormItem>
                  <FormLabel>Target</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="typeRequest" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type Request</FormLabel>
                  <FormControl><Input placeholder="e.g. post, register" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="externalId" render={({ field }) => (
                <FormItem>
                  <FormLabel>External ID</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="serviceGroupId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Group ID</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="assignedUserId" render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned User ID</FormLabel>
                <FormControl><Input placeholder="UUID of internal user" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Dynamic Config Section */}
            <Separator />
            {watchedServiceType === ServiceType.ENTITY && <EntityConfigFields form={form} />}
            {watchedServiceType === ServiceType.BLOG2 && <Blog2ConfigFields form={form} />}
            {watchedServiceType === ServiceType.SOCIAL && <SocialConfigFields form={form} />}
            {watchedServiceType === ServiceType.PODCAST && <PodcastConfigFields form={form} />}
            {watchedServiceType === ServiceType.GG_STACKING && <GGStackingConfigFields form={form} />}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
