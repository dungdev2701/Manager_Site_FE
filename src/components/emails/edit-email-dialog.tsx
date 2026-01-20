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
import { gmailApi } from '@/lib/api';
import { Gmail, GmailStatus } from '@/types';

const editEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  appPassword: z.string().optional(),
  twoFA: z.string().optional(),
  recoveryEmail: z.string().email('Invalid recovery email').optional().or(z.literal('')),
  status: z.nativeEnum(GmailStatus),
});

type EditEmailFormValues = z.infer<typeof editEmailSchema>;

interface EditEmailDialogProps {
  email: Gmail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEmailDialog({ email, open, onOpenChange }: EditEmailDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<EditEmailFormValues>({
    resolver: zodResolver(editEmailSchema),
    defaultValues: {
      email: '',
      password: '',
      appPassword: '',
      twoFA: '',
      recoveryEmail: '',
      status: GmailStatus.SUCCESS,
    },
  });

  useEffect(() => {
    if (email) {
      form.reset({
        email: email.email,
        password: email.password,
        appPassword: email.appPassword || '',
        twoFA: email.twoFA || '',
        recoveryEmail: email.recoveryEmail || '',
        status: email.status,
      });
    }
  }, [email, form]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof gmailApi.update>[1] }) =>
      gmailApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmails'] });
      toast.success('Email updated successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update email');
    },
  });

  const onSubmit = (data: EditEmailFormValues) => {
    if (!email) return;

    updateMutation.mutate({
      id: email.id,
      data: {
        email: data.email,
        password: data.password,
        appPassword: data.appPassword || null,
        twoFA: data.twoFA || null,
        recoveryEmail: data.recoveryEmail || null,
        status: data.status,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Email</DialogTitle>
          <DialogDescription>
            Update the Gmail account information.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
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
              control={form.control}
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
              control={form.control}
              name="appPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App Password</FormLabel>
                  <FormControl>
                    <Input placeholder="16-character app password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
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
              control={form.control}
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
