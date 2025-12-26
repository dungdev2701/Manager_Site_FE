'use client';

import { QueryProvider } from './query-provider';
import { Toaster } from '@/components/ui/sonner';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      {children}
      <Toaster position="top-right" richColors />
    </QueryProvider>
  );
}
