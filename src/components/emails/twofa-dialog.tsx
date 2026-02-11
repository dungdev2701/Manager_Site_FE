'use client';

import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, Key, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface TwoFADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  secret: string;
}

// TOTP implementation
function base32ToBytes(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  // Remove spaces and convert to uppercase
  const cleanedBase32 = base32.replace(/\s+/g, '').toUpperCase();

  let bits = '';
  for (const char of cleanedBase32) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue; // Skip invalid characters
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
  }

  return bytes;
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

async function generateTOTP(secret: string, timeStep = 30, digits = 6): Promise<string> {
  const key = base32ToBytes(secret);
  const time = Math.floor(Date.now() / 1000 / timeStep);

  // Convert time to 8-byte big-endian
  const timeBytes = new Uint8Array(8);
  let tempTime = time;
  for (let i = 7; i >= 0; i--) {
    timeBytes[i] = tempTime & 0xff;
    tempTime = Math.floor(tempTime / 256);
  }

  const hmac = await hmacSha1(key, timeBytes);

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

function getTimeRemaining(timeStep = 30): number {
  const now = Math.floor(Date.now() / 1000);
  return timeStep - (now % timeStep);
}

export function TwoFADialog({ open, onOpenChange, email, secret }: TwoFADialogProps) {
  const [code, setCode] = useState<string>('------');
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateCode = useCallback(async () => {
    if (!secret) return;

    setIsGenerating(true);
    try {
      const newCode = await generateTOTP(secret);
      setCode(newCode);
    } catch (error) {
      console.error('Failed to generate TOTP:', error);
      setCode('ERROR');
      toast.error('Không thể tạo mã 2FA. Secret key không hợp lệ.');
    } finally {
      setIsGenerating(false);
    }
  }, [secret]);

  useEffect(() => {
    if (!open || !secret) return;

    // Generate code immediately
    generateCode();
    setTimeRemaining(getTimeRemaining());

    // Update every second
    const interval = setInterval(() => {
      const remaining = getTimeRemaining();
      setTimeRemaining(remaining);

      // Regenerate code when timer resets
      if (remaining === 30) {
        generateCode();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [open, secret, generateCode]);

  const handleCopy = async () => {
    if (code === '------' || code === 'ERROR') return;

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Đã copy mã 2FA');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Không thể copy');
    }
  };

  const progressValue = (timeRemaining / 30) * 100;
  const isLowTime = timeRemaining <= 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Mã xác thực 2FA
          </DialogTitle>
          <DialogDescription>
            Mã 2FA cho <span className="font-medium text-foreground">{email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* TOTP Code Display */}
          <div className="relative">
            <div
              className={`text-5xl font-mono font-bold tracking-[0.5em] px-6 py-4 bg-muted rounded-lg border-2 transition-colors ${
                isLowTime ? 'border-red-300 bg-red-50' : 'border-transparent'
              }`}
            >
              {isGenerating ? (
                <RefreshCw className="h-10 w-10 animate-spin mx-auto" />
              ) : (
                code
              )}
            </div>
          </div>

          {/* Copy Button */}
          <Button
            variant="outline"
            size="lg"
            onClick={handleCopy}
            disabled={code === '------' || code === 'ERROR' || isGenerating}
            className="w-full max-w-xs gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                Đã copy
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy mã
              </>
            )}
          </Button>

          {/* Countdown Timer */}
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mã mới sau</span>
              <span className={`font-medium ${isLowTime ? 'text-red-600' : ''}`}>
                {timeRemaining}s
              </span>
            </div>
            <Progress
              value={progressValue}
              className={`h-2 ${isLowTime ? '[&>div]:bg-red-500' : ''}`}
            />
          </div>

          {/* Secret (hidden by default) */}
          <details className="w-full max-w-xs">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Hiện secret key
            </summary>
            <div className="mt-2 p-2 bg-muted rounded text-xs font-mono break-all">
              {secret}
            </div>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}
