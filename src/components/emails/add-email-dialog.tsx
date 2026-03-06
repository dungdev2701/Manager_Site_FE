'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Upload, FileText, X } from 'lucide-react';
import * as XLSX from 'xlsx';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { gmailApi, BulkCreateGmailItem } from '@/lib/api';
import { GmailStatus } from '@/types';

// ==================== SCHEMAS ====================

const addEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  appPassword: z.string().optional(),
  twoFA: z.string().optional(),
  recoveryEmail: z.string().email('Invalid recovery email').optional().or(z.literal('')),
  status: z.nativeEnum(GmailStatus).optional(),
});

const bulkEmailSchema = z.object({
  emailsText: z.string().min(1, 'At least one email is required'),
});

type AddEmailFormValues = z.infer<typeof addEmailSchema>;
type BulkEmailFormValues = z.infer<typeof bulkEmailSchema>;

interface AddEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ==================== COMPONENT ====================

export function AddEmailDialog({ open, onOpenChange }: AddEmailDialogProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parsedEmails, setParsedEmails] = useState<BulkCreateGmailItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // ==================== SINGLE FORM ====================

  const singleForm = useForm<AddEmailFormValues>({
    resolver: zodResolver(addEmailSchema),
    defaultValues: {
      email: '',
      password: '',
      appPassword: '',
      twoFA: '',
      recoveryEmail: '',
      status: GmailStatus.SUCCESS,
    },
  });

  const createMutation = useMutation({
    mutationFn: gmailApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmails'] });
      toast.success('Email created successfully');
      singleForm.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create email');
    },
  });

  const onSingleSubmit = (data: AddEmailFormValues) => {
    createMutation.mutate({
      email: data.email,
      password: data.password,
      appPassword: data.appPassword || undefined,
      twoFA: data.twoFA || undefined,
      recoveryEmail: data.recoveryEmail || undefined,
      status: data.status,
    });
  };

  // ==================== BULK FORM ====================

  const bulkForm = useForm<BulkEmailFormValues>({
    resolver: zodResolver(bulkEmailSchema),
    defaultValues: {
      emailsText: '',
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: gmailApi.bulkCreate,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['gmails'] });

      const messages: string[] = [];
      if (result.created > 0) messages.push(`${result.created} emails created`);
      if (result.duplicates.length > 0) messages.push(`${result.duplicates.length} duplicates skipped`);
      if (result.invalid.length > 0) messages.push(`${result.invalid.length} invalid emails`);

      if (result.created > 0) {
        toast.success(messages.join(', '));
      } else {
        toast.warning(messages.join(', '));
      }

      bulkForm.reset();
      setUploadedFile(null);
      setParsedEmails([]);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import emails');
    },
  });

  // ==================== FILE PARSING ====================

  const parseTextFile = (file: File): Promise<BulkCreateGmailItem[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const items: BulkCreateGmailItem[] = [];

        const lines = text.split(/[\r\n]+/).filter((line) => line.trim().length > 0);
        for (const line of lines) {
          const parts = line.split(/[:|]/).map((p) => p.trim());
          if (parts.length >= 2 && parts[0] && parts[1]) {
            items.push({
              email: parts[0],
              password: parts[1],
              twoFA: parts[2] || undefined,
              recoveryEmail: parts[3] || undefined,
            });
          }
        }

        resolve(items);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseExcelFile = (file: File): Promise<BulkCreateGmailItem[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const items: BulkCreateGmailItem[] = [];

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

          for (const row of jsonData) {
            if (!Array.isArray(row) || row.length < 2) continue;
            const email = String(row[0] || '').trim();
            const password = String(row[1] || '').trim();
            if (!email || !password) continue;

            items.push({
              email,
              password,
              twoFA: row[2] ? String(row[2]).trim() : undefined,
              recoveryEmail: row[3] ? String(row[3]).trim() : undefined,
            });
          }

          resolve(items);
        } catch {
          reject(new Error('Failed to parse Excel file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.txt', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
      toast.error('Please upload a .txt or .xlsx/.xls file');
      return;
    }

    setIsParsingFile(true);
    setUploadedFile(file);

    try {
      let items: BulkCreateGmailItem[];
      if (fileExtension === '.txt') {
        items = await parseTextFile(file);
      } else {
        items = await parseExcelFile(file);
      }

      if (items.length === 0) {
        toast.error('No emails found in file');
        setUploadedFile(null);
        return;
      }

      if (items.length > 1000) {
        toast.warning(`Found ${items.length} emails. Only first 1000 will be used.`);
        items = items.slice(0, 1000);
      }

      setParsedEmails(items);
      bulkForm.setValue(
        'emailsText',
        items.map((i) => `${i.email}:${i.password}${i.twoFA ? ':' + i.twoFA : ''}${i.recoveryEmail ? ':' + i.recoveryEmail : ''}`).join('\n')
      );
      toast.success(`Loaded ${items.length} emails from file`);
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
    bulkForm.setValue('emailsText', '');
    setParsedEmails([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onBulkSubmit = () => {
    let items: BulkCreateGmailItem[];

    if (parsedEmails.length > 0) {
      // Use parsed data from file
      items = parsedEmails;
    } else {
      // Parse from textarea
      const text = bulkForm.getValues('emailsText');
      const lines = text.split(/[\r\n]+/).filter((line) => line.trim().length > 0);
      items = [];

      for (const line of lines) {
        const parts = line.split(/[:|]/).map((p) => p.trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
          items.push({
            email: parts[0],
            password: parts[1],
            twoFA: parts[2] || undefined,
            recoveryEmail: parts[3] || undefined,
          });
        }
      }
    }

    if (items.length === 0) {
      toast.error('No valid emails found. Format: email:password:2fa:recovery');
      return;
    }

    if (items.length > 1000) {
      toast.error('Maximum 1000 emails allowed');
      return;
    }

    bulkCreateMutation.mutate(items);
  };

  const isLoading = createMutation.isPending || bulkCreateMutation.isPending;

  // ==================== RENDER ====================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Email</DialogTitle>
          <DialogDescription>
            Add a single email or import multiple emails at once.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'single' | 'bulk')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
          </TabsList>

          {/* ==================== SINGLE TAB ==================== */}
          <TabsContent value="single" className="mt-4">
            <Form {...singleForm}>
              <form onSubmit={singleForm.handleSubmit(onSingleSubmit)} className="space-y-4">
                <FormField
                  control={singleForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input placeholder="example@gmail.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={singleForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={singleForm.control}
                  name="appPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>App Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="16-character app password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={singleForm.control}
                  name="twoFA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>2FA Secret</FormLabel>
                      <FormControl>
                        <Input placeholder="2FA secret key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={singleForm.control}
                  name="recoveryEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recovery Email</FormLabel>
                      <FormControl>
                        <Input placeholder="recovery@gmail.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={singleForm.control}
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
                          <SelectItem value={GmailStatus.NEW}>New</SelectItem>
                          <SelectItem value={GmailStatus.RUNNING}>Running</SelectItem>
                          <SelectItem value={GmailStatus.SUCCESS}>Success</SelectItem>
                          <SelectItem value={GmailStatus.FAILED}>Failed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Email
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          {/* ==================== BULK IMPORT TAB ==================== */}
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
                      id="email-file-upload"
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
                      {parsedEmails.length > 0 && (
                        <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-xs text-green-700">
                            Loaded {parsedEmails.length} emails from file
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    TXT: each line as <code>email:password:2fa:recovery</code> (separated by <code>:</code> or <code>|</code>)
                    <br />
                    Excel: columns in order - Email, Password, 2FA, Recovery Email
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
                  name="emailsText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emails</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={"Enter one email per line:\nemail@gmail.com:password123:2fasecret:recovery@gmail.com\nemail2@gmail.com|pass456|2fa|recovery2@gmail.com"}
                          className="resize-none font-mono text-sm"
                          rows={8}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            // Clear parsed file data when user manually edits
                            if (parsedEmails.length > 0) {
                              setParsedEmails([]);
                              setUploadedFile(null);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        {field.value
                          ? `${field.value.split('\n').filter((l) => l.trim()).length} lines entered`
                          : 'Maximum 1000 emails. Format: email:password:2fa:recovery'}
                      </p>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading || isParsingFile}>
                    {bulkCreateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Import Emails
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
