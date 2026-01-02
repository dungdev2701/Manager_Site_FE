'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Upload, FileText, X, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { websiteApi, BulkWebsiteItem } from '@/lib/api';
import { WebsiteMetrics, WebsiteStatus, WebsiteType } from '@/types';

const singleWebsiteSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  type: z.enum(['ENTITY', 'BLOG2', 'PODCAST', 'SOCIAL']).optional(),
  notes: z.string().max(5000).optional(),
  // Metrics fields - use string for form input, convert when submitting
  traffic: z.string().optional(),
  DA: z.string().optional(),
  captcha_type: z.enum(['captcha', 'normal']).optional(),
  captcha_provider: z.enum(['recaptcha', 'hcaptcha']).optional(), // Only when captcha_type = 'captcha'
  cloudflare: z.enum(['yes', 'no']).optional(), // Only when captcha_type = 'normal'
  index: z.enum(['yes', 'no']).optional(),
  username: z.enum(['unique', 'duplicate', 'no']).optional(), // Unique: không trùng, Duplicate: được trùng, No: không có username
  email: z.enum(['multi', 'no_multi']).optional(),
  required_gmail: z.enum(['yes', 'no']).optional(),
  verify: z.enum(['yes', 'no']).optional(),
  about: z.enum(['no_stacking', 'stacking_post', 'stacking_about', 'long_about']).optional(),
  about_max_chars: z.string().optional(), // Max characters allowed for about
  text_link: z.enum(['no', 'href', 'markdown', 'BBCode']).optional(),
  social_connect: z.array(z.enum(['facebook', 'twitter', 'youtube', 'linkedin'])).optional(),
  avatar: z.enum(['yes', 'no']).optional(),
  cover: z.enum(['yes', 'no']).optional(),
});

const bulkWebsiteSchema = z.object({
  domains: z.string().min(1, 'At least one domain is required'),
});

type SingleWebsiteFormValues = z.infer<typeof singleWebsiteSchema>;
type BulkWebsiteFormValues = z.infer<typeof bulkWebsiteSchema>;

interface AddWebsiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOCIAL_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
] as const;

export function AddWebsiteDialog({ open, onOpenChange }: AddWebsiteDialogProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [bulkWebsites, setBulkWebsites] = useState<BulkWebsiteItem[]>([]); // Store parsed websites with metrics
  const [isExcelWithMetrics, setIsExcelWithMetrics] = useState(false); // Track if Excel has metrics columns
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const singleForm = useForm<SingleWebsiteFormValues>({
    resolver: zodResolver(singleWebsiteSchema),
    defaultValues: {
      domain: '',
      notes: '',
      social_connect: [],
    },
  });

  const bulkForm = useForm<BulkWebsiteFormValues>({
    resolver: zodResolver(bulkWebsiteSchema),
    defaultValues: {
      domains: '',
    },
  });

  const createSingleMutation = useMutation({
    mutationFn: websiteApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      toast.success('Website created successfully');
      singleForm.reset();
      setShowMetrics(false);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create website');
    },
  });

  const createBulkMutation = useMutation({
    mutationFn: websiteApi.bulkCreate,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });

      const messages: string[] = [];
      if (result.created > 0) {
        messages.push(`${result.created} websites created`);
      }
      if (result.duplicates.length > 0) {
        messages.push(`${result.duplicates.length} duplicates skipped`);
      }
      if (result.invalid.length > 0) {
        messages.push(`${result.invalid.length} invalid domains`);
      }

      if (result.created > 0) {
        toast.success(messages.join(', '));
      } else {
        toast.warning(messages.join(', '));
      }

      bulkForm.reset();
      setUploadedFile(null);
      setBulkWebsites([]);
      setIsExcelWithMetrics(false);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create websites');
    },
  });

  const createBulkWithMetricsMutation = useMutation({
    mutationFn: websiteApi.bulkCreateWithMetrics,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });

      const messages: string[] = [];
      if (result.created > 0) {
        messages.push(`${result.created} websites created`);
      }
      if (result.duplicates.length > 0) {
        messages.push(`${result.duplicates.length} duplicates skipped`);
      }
      if (result.invalid.length > 0) {
        messages.push(`${result.invalid.length} invalid domains`);
      }

      if (result.created > 0) {
        toast.success(messages.join(', '));
      } else {
        toast.warning(messages.join(', '));
      }

      bulkForm.reset();
      setUploadedFile(null);
      setBulkWebsites([]);
      setIsExcelWithMetrics(false);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create websites');
    },
  });

  const parseTextFile = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const domains = text
          .split(/[\r\n]+/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        resolve(domains);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseExcelFile = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const domains: string[] = [];

          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
              header: 1,
            });

            jsonData.forEach((row) => {
              if (Array.isArray(row) && row.length > 0) {
                const cellValue = String(row[0]).trim();
                if (cellValue && cellValue.length > 0) {
                  domains.push(cellValue);
                }
              }
            });
          });

          resolve(domains);
        } catch {
          reject(new Error('Failed to parse Excel file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  /**
   * Parse Excel file với đầy đủ các cột metrics
   * Cột: domain, index, traffic, DA, Captcha, kiểu Captcha, username, Email, verify, About, Text Link, Social Connect, Avatar, Cover, Status
   */
  const parseExcelFileWithMetrics = (file: File): Promise<BulkWebsiteItem[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const websites: BulkWebsiteItem[] = [];

          // Only process first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

          jsonData.forEach((row) => {
            const domain = String(row['domain'] || row['Domain'] || '').trim();
            if (!domain) return;

            const metrics: WebsiteMetrics = {};

            // Index (Yes/No)
            const indexVal = String(row['index'] || row['Index'] || '').toLowerCase().trim();
            if (indexVal === 'yes' || indexVal === 'no') {
              metrics.index = indexVal as 'yes' | 'no';
            }

            // Traffic (support K/M suffix: 9.3K = 9300, 1.5M = 1500000)
            const trafficVal = row['traffic'] || row['Traffic'];
            if (trafficVal !== undefined && trafficVal !== '') {
              let trafficStr = String(trafficVal).trim().toUpperCase();
              let multiplier = 1;
              if (trafficStr.endsWith('K')) {
                multiplier = 1000;
                trafficStr = trafficStr.slice(0, -1);
              } else if (trafficStr.endsWith('M')) {
                multiplier = 1000000;
                trafficStr = trafficStr.slice(0, -1);
              }
              const trafficNum = Number(trafficStr) * multiplier;
              if (!isNaN(trafficNum) && trafficNum >= 0) {
                metrics.traffic = Math.round(trafficNum);
              }
            }

            // DA
            const daVal = row['DA'] || row['da'];
            if (daVal !== undefined && daVal !== '') {
              const daNum = Number(daVal);
              if (!isNaN(daNum) && daNum >= 0 && daNum <= 100) {
                metrics.DA = daNum;
              }
            }

            // Captcha column - can be: Yes/No or Normal/Captcha
            const captchaVal = String(row['Captcha'] || row['captcha'] || '').toLowerCase().trim();
            if (captchaVal === 'yes' || captchaVal === 'captcha') {
              metrics.captcha_type = 'captcha';
            } else if (captchaVal === 'no' || captchaVal === 'normal') {
              metrics.captcha_type = 'normal';
            }

            // Kiểu Captcha (Recaptcha, HCaptcha, Cloudflare, No)
            const captchaTypeVal = String(row['kiểu Captcha'] || row['Kiểu Captcha'] || row['captcha_type'] || row['Kieu Captcha'] || '').toLowerCase().trim();
            if (captchaTypeVal === 'recaptcha') {
              metrics.captcha_type = 'captcha';
              metrics.captcha_provider = 'recaptcha';
            } else if (captchaTypeVal === 'hcaptcha') {
              metrics.captcha_type = 'captcha';
              metrics.captcha_provider = 'hcaptcha';
            } else if (captchaTypeVal === 'cloudflare') {
              metrics.captcha_type = 'normal';
              metrics.cloudflare = true;
            } else if (captchaTypeVal === 'no' || captchaTypeVal === 'none') {
              // No captcha provider - just normal without cloudflare
              if (!metrics.captcha_type) {
                metrics.captcha_type = 'normal';
              }
              metrics.cloudflare = false;
            }

            // Username (No, Unique, Duplicate)
            const usernameVal = String(row['username'] || row['Username'] || '').toLowerCase().trim();
            if (usernameVal === 'unique') {
              metrics.username = 'unique';
            } else if (usernameVal === 'duplicate') {
              metrics.username = 'duplicate';
            } else if (usernameVal === 'no') {
              metrics.username = 'no';
            }

            // Email (Multi, No Multi)
            const emailVal = String(row['Email'] || row['email'] || '').toLowerCase().trim();
            if (emailVal === 'multi') {
              metrics.email = 'multi';
            } else if (emailVal === 'no multi' || emailVal === 'no_multi' || emailVal === 'nomulti') {
              metrics.email = 'no_multi';
            }

            // Verify (Yes/No)
            const verifyVal = String(row['verify'] || row['Verify'] || '').toLowerCase().trim();
            if (verifyVal === 'yes') {
              metrics.verify = 'yes';
            } else if (verifyVal === 'no') {
              metrics.verify = 'no';
            }

            // About (No Stacking, Stacking About, Stacking Post, Long About)
            const aboutVal = String(row['About'] || row['about'] || '').toLowerCase().trim();
            if (aboutVal === 'no stacking' || aboutVal === 'no_stacking' || aboutVal === 'nostacking') {
              metrics.about = 'no_stacking';
            } else if (aboutVal === 'stacking about' || aboutVal === 'stacking_about' || aboutVal === 'stackingabout') {
              metrics.about = 'stacking_about';
            } else if (aboutVal === 'stacking post' || aboutVal === 'stacking_post' || aboutVal === 'stackingpost') {
              metrics.about = 'stacking_post';
            } else if (aboutVal === 'long about' || aboutVal === 'long_about' || aboutVal === 'longabout') {
              metrics.about = 'long_about';
            }

            // Text Link (No, Hrefs, Markdown, BBCode)
            const textLinkVal = String(row['Text Link'] || row['text_link'] || row['TextLink'] || '').toLowerCase().trim();
            if (textLinkVal === 'no') {
              metrics.text_link = 'no';
            } else if (textLinkVal === 'href' || textLinkVal === 'hrefs') {
              metrics.text_link = 'href';
            } else if (textLinkVal === 'markdown') {
              metrics.text_link = 'markdown';
            } else if (textLinkVal === 'bbcode') {
              metrics.text_link = 'BBCode';
            }

            // Social Connect (comma separated: facebook, twitter, youtube, linkedin)
            const socialVal = String(row['Social Connect'] || row['social_connect'] || row['SocialConnect'] || '').toLowerCase().trim();
            if (socialVal && socialVal !== 'no') {
              const socialArr: ('facebook' | 'twitter' | 'youtube' | 'linkedin')[] = [];
              if (socialVal.includes('facebook')) socialArr.push('facebook');
              if (socialVal.includes('twitter')) socialArr.push('twitter');
              if (socialVal.includes('youtube')) socialArr.push('youtube');
              if (socialVal.includes('linkedin')) socialArr.push('linkedin');
              if (socialArr.length > 0) {
                metrics.social_connect = socialArr;
              }
            }

            // Avatar (Yes/No)
            const avatarVal = String(row['Avatar'] || row['avatar'] || '').toLowerCase().trim();
            if (avatarVal === 'yes') {
              metrics.avatar = 'yes';
            } else if (avatarVal === 'no') {
              metrics.avatar = 'no';
            }

            // Cover (Yes/No)
            const coverVal = String(row['Cover'] || row['cover'] || '').toLowerCase().trim();
            if (coverVal === 'yes') {
              metrics.cover = 'yes';
            } else if (coverVal === 'no') {
              metrics.cover = 'no';
            }

            // Status
            const statusVal = String(row['Status'] || row['status'] || '').toUpperCase().trim();
            let status: WebsiteStatus | undefined;
            if (['NEW', 'CHECKING', 'HANDING', 'PENDING', 'RUNNING', 'ERROR', 'MAINTENANCE'].includes(statusVal)) {
              status = statusVal as WebsiteStatus;
            }

            websites.push({
              domain,
              metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
              status,
            });
          });

          resolve(websites);
        } catch {
          reject(new Error('Failed to parse Excel file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  /**
   * Check if Excel file has metrics columns (more than just domain)
   */
  const checkExcelHasMetricsColumns = (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

          if (jsonData.length > 0) {
            const firstRow = jsonData[0];
            const keys = Object.keys(firstRow).map(k => k.toLowerCase());
            // Check if there are any metrics columns beyond domain
            const metricsColumns = ['index', 'traffic', 'da', 'captcha', 'kiểu captcha', 'username', 'email', 'verify', 'about', 'text link', 'social connect', 'avatar', 'cover', 'status'];
            const hasMetrics = metricsColumns.some(col => keys.some(k => k.includes(col)));
            resolve(hasMetrics);
          } else {
            resolve(false);
          }
        } catch {
          reject(new Error('Failed to check Excel file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'text/plain',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const validExtensions = ['.txt', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      toast.error('Please upload a .txt or .xlsx/.xls file');
      return;
    }

    setIsParsingFile(true);
    setUploadedFile(file);

    try {
      if (fileExtension === '.txt' || file.type === 'text/plain') {
        // Text file - only domains
        let domains = await parseTextFile(file);

        if (domains.length === 0) {
          toast.error('No domains found in file');
          setUploadedFile(null);
          return;
        }

        if (domains.length > 1000) {
          toast.warning(`Found ${domains.length} domains. Only first 1000 will be used.`);
          domains = domains.slice(0, 1000);
        }

        setIsExcelWithMetrics(false);
        setBulkWebsites([]);
        bulkForm.setValue('domains', domains.join('\n'));
        toast.success(`Loaded ${domains.length} domains from file`);
      } else {
        // Excel file - check if it has metrics columns
        const hasMetrics = await checkExcelHasMetricsColumns(file);

        if (hasMetrics) {
          // Parse with metrics
          let websites = await parseExcelFileWithMetrics(file);

          if (websites.length === 0) {
            toast.error('No websites found in file');
            setUploadedFile(null);
            return;
          }

          if (websites.length > 1000) {
            toast.warning(`Found ${websites.length} websites. Only first 1000 will be used.`);
            websites = websites.slice(0, 1000);
          }

          setIsExcelWithMetrics(true);
          setBulkWebsites(websites);
          bulkForm.setValue('domains', websites.map(w => w.domain).join('\n'));
          toast.success(`Loaded ${websites.length} websites with metrics from Excel`);
        } else {
          // Parse as simple domains
          let domains = await parseExcelFile(file);

          if (domains.length === 0) {
            toast.error('No domains found in file');
            setUploadedFile(null);
            return;
          }

          if (domains.length > 1000) {
            toast.warning(`Found ${domains.length} domains. Only first 1000 will be used.`);
            domains = domains.slice(0, 1000);
          }

          setIsExcelWithMetrics(false);
          setBulkWebsites([]);
          bulkForm.setValue('domains', domains.join('\n'));
          toast.success(`Loaded ${domains.length} domains from file`);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse file');
      setUploadedFile(null);
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    bulkForm.setValue('domains', '');
    setBulkWebsites([]);
    setIsExcelWithMetrics(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSingleSubmit = (data: SingleWebsiteFormValues) => {
    const metrics: WebsiteMetrics = {};

    // Convert string to number for traffic and DA
    if (data.traffic) {
      const trafficNum = parseInt(data.traffic, 10);
      if (!isNaN(trafficNum) && trafficNum >= 0) metrics.traffic = trafficNum;
    }
    if (data.DA) {
      const daNum = parseInt(data.DA, 10);
      if (!isNaN(daNum) && daNum >= 0 && daNum <= 100) metrics.DA = daNum;
    }
    if (data.captcha_type) {
      metrics.captcha_type = data.captcha_type;
      // Only save captcha_provider if captcha_type is 'captcha'
      if (data.captcha_type === 'captcha' && data.captcha_provider) {
        metrics.captcha_provider = data.captcha_provider;
      }
      // Only save cloudflare if captcha_type is 'normal'
      if (data.captcha_type === 'normal' && data.cloudflare) {
        metrics.cloudflare = data.cloudflare === 'yes';
      }
    }
    if (data.index) metrics.index = data.index;
    if (data.username) metrics.username = data.username;
    if (data.email) metrics.email = data.email;
    if (data.required_gmail) metrics.required_gmail = data.required_gmail;
    if (data.verify) metrics.verify = data.verify;
    if (data.about) metrics.about = data.about;
    if (data.about_max_chars) {
      const maxCharsNum = parseInt(data.about_max_chars, 10);
      if (!isNaN(maxCharsNum) && maxCharsNum > 0) metrics.about_max_chars = maxCharsNum;
    }
    if (data.text_link) metrics.text_link = data.text_link;
    if (data.social_connect && data.social_connect.length > 0)
      metrics.social_connect = data.social_connect;
    if (data.avatar) metrics.avatar = data.avatar;
    if (data.cover) metrics.cover = data.cover;

    createSingleMutation.mutate({
      domain: data.domain,
      type: data.type as WebsiteType | undefined,
      notes: data.notes,
      metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
    });
  };

  const onBulkSubmit = (data: BulkWebsiteFormValues) => {
    // If we have parsed websites with metrics from Excel, use the new API
    if (isExcelWithMetrics && bulkWebsites.length > 0) {
      if (bulkWebsites.length > 1000) {
        toast.error('Maximum 1000 websites allowed');
        return;
      }
      createBulkWithMetricsMutation.mutate(bulkWebsites);
      return;
    }

    // Otherwise, use the simple bulk create API
    const domains = data.domains
      .split('\n')
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    if (domains.length === 0) {
      toast.error('Please enter at least one domain');
      return;
    }

    if (domains.length > 1000) {
      toast.error('Maximum 1000 domains allowed');
      return;
    }

    createBulkMutation.mutate(domains);
  };

  const isLoading = createSingleMutation.isPending || createBulkMutation.isPending || createBulkWithMetricsMutation.isPending;

  const socialConnect = singleForm.watch('social_connect') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Website</DialogTitle>
          <DialogDescription>
            Add a single website or import multiple domains at once.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'single' | 'bulk')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-4">
            <Form {...singleForm}>
              <form onSubmit={singleForm.handleSubmit(onSingleSubmit)} className="space-y-4">
                <FormField
                  control={singleForm.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain *</FormLabel>
                      <FormControl>
                        <Input placeholder="example.com or https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={singleForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ENTITY">Entity</SelectItem>
                          <SelectItem value="BLOG2">Blog 2.0</SelectItem>
                          <SelectItem value="PODCAST">Podcast</SelectItem>
                          <SelectItem value="SOCIAL">Social</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={singleForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any notes about this website..."
                          className="resize-none"
                          rows={2}
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
                    <span>Metrics (Optional)</span>
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
                          control={singleForm.control}
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
                          control={singleForm.control}
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
                          control={singleForm.control}
                          name="captcha_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Captcha Type</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  // Reset conditional fields when captcha_type changes
                                  singleForm.setValue('captcha_provider', undefined);
                                  singleForm.setValue('cloudflare', undefined);
                                }}
                                value={field.value}
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
                        {singleForm.watch('captcha_type') === 'captcha' && (
                          <FormField
                            control={singleForm.control}
                            name="captcha_provider"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Captcha Provider</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
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
                        {singleForm.watch('captcha_type') === 'normal' && (
                          <FormField
                            control={singleForm.control}
                            name="cloudflare"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cloudflare</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
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
                        {!singleForm.watch('captcha_type') && (
                          <FormField
                            control={singleForm.control}
                            name="index"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Index</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
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
                        {singleForm.watch('captcha_type') && (
                          <FormField
                            control={singleForm.control}
                            name="index"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Index</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
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
                          control={singleForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
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
                          control={singleForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
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
                          control={singleForm.control}
                          name="required_gmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Required Gmail</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
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
                        control={singleForm.control}
                        name="verify"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Verify</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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

                      {/* Row 3: About & Max Chars */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={singleForm.control}
                          name="about"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>About</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
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
                          control={singleForm.control}
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

                      {/* Row 4: Text Link */}
                      <FormField
                        control={singleForm.control}
                        name="text_link"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Text Link</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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
                        control={singleForm.control}
                        name="social_connect"
                        render={() => (
                          <FormItem>
                            <FormLabel>Social Connect</FormLabel>
                            <div className="flex flex-wrap gap-4">
                              {SOCIAL_OPTIONS.map((option) => (
                                <div key={option.value} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={option.value}
                                    checked={socialConnect.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                      const current = singleForm.getValues('social_connect') || [];
                                      if (checked) {
                                        singleForm.setValue('social_connect', [
                                          ...current,
                                          option.value,
                                        ]);
                                      } else {
                                        singleForm.setValue(
                                          'social_connect',
                                          current.filter((v) => v !== option.value)
                                        );
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={option.value}
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
                          control={singleForm.control}
                          name="avatar"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Avatar</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
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
                          control={singleForm.control}
                          name="cover"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cover</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
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
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Website
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="bulk" className="mt-4">
            <Form {...bulkForm}>
              <form onSubmit={bulkForm.handleSubmit(onBulkSubmit)} className="space-y-4">
                {/* File Upload Section */}
                <div className="space-y-2">
                  <FormLabel>Upload File</FormLabel>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isParsingFile}
                      className="flex-1"
                    >
                      {isParsingFile ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {isParsingFile ? 'Parsing...' : 'Choose File (.txt, .xlsx)'}
                    </Button>
                  </div>
                  {uploadedFile && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm flex-1 truncate">{uploadedFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={handleRemoveFile}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {isExcelWithMetrics && bulkWebsites.length > 0 && (
                        <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-xs text-green-700">
                            ✓ Detected {bulkWebsites.length} websites with metrics data (Index, Traffic, DA, Captcha, Username, Email, Verify, About, Text Link, Social, Avatar, Cover, Status)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Upload a .txt file (one domain per line) or Excel file with columns: domain, index, traffic, DA, Captcha, kiểu Captcha, username, Email, verify, About, Text Link, Social Connect, Avatar, Cover, Status
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or enter manually
                    </span>
                  </div>
                </div>

                <FormField
                  control={bulkForm.control}
                  name="domains"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domains</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter one domain per line:&#10;example.com&#10;blog.example.org&#10;https://shop.example.net"
                          className="resize-none font-mono text-sm"
                          rows={8}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        {field.value
                          ? `${field.value.split('\n').filter((l) => l.trim()).length} domains entered${isExcelWithMetrics ? ' (with metrics)' : ''}`
                          : 'Maximum 1000 domains'}
                      </p>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading || isParsingFile}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Import Websites
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
