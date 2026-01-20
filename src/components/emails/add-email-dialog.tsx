'use client';

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
import { GmailStatus } from '@/types';

const addEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  appPassword: z.string().optional(),
  twoFA: z.string().optional(),
  recoveryEmail: z.string().email('Invalid recovery email').optional().or(z.literal('')),
  status: z.nativeEnum(GmailStatus).optional(),
});

type AddEmailFormValues = z.infer<typeof addEmailSchema>;

interface AddEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEmailDialog({ open, onOpenChange }: AddEmailDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<AddEmailFormValues>({
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
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create email');
    },
  });

  const onSubmit = (data: AddEmailFormValues) => {
    createMutation.mutate({
      email: data.email,
      password: data.password,
      appPassword: data.appPassword || undefined,
      twoFA: data.twoFA || undefined,
      recoveryEmail: data.recoveryEmail || undefined,
      status: data.status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Email</DialogTitle>
          <DialogDescription>
            Add a new Gmail account to the system.
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
                    <Input type="password" placeholder="16-character app password" {...field} />
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Email
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
