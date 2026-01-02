'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Registration is disabled - redirect to login page
// Only admins can create user accounts
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}
