'use client';

import { format } from 'date-fns';
import {
  Globe,
  Calendar,
  User,
  FileText,
  Activity,
  Shield,
  Mail,
  Link2,
  Users,
  Image,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from '@/lib/constants';
import { Website, WebsiteStatus } from '@/types';

interface WebsiteDetailDialogProps {
  website: Website | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  return format(new Date(date), 'dd/MM/yyyy HH:mm');
}

function formatTraffic(traffic?: number): string {
  if (!traffic) return '-';
  if (traffic >= 1000000) return `${(traffic / 1000000).toFixed(1)}M`;
  if (traffic >= 1000) return `${(traffic / 1000).toFixed(1)}K`;
  return traffic.toString();
}

function InfoRow({ icon: Icon, label, value, className }: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${className || ''}`}>
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium break-all">{value || '-'}</div>
      </div>
    </div>
  );
}

function MetricBadge({ value, yesLabel, noLabel }: {
  value?: 'yes' | 'no';
  yesLabel: string;
  noLabel: string;
}) {
  if (!value) return <span className="text-muted-foreground">-</span>;
  return value === 'yes' ? (
    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
      <CheckCircle className="h-3 w-3 mr-1" />
      {yesLabel}
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
      <XCircle className="h-3 w-3 mr-1" />
      {noLabel}
    </Badge>
  );
}

export function WebsiteDetailDialog({
  website,
  open,
  onOpenChange,
}: WebsiteDetailDialogProps) {
  if (!website) return null;

  const metrics = website.metrics;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Website Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow
                icon={Globe}
                label="Domain"
                value={
                  <a
                    href={`https://${website.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {website.domain}
                  </a>
                }
              />
              <InfoRow
                icon={Activity}
                label="Status"
                value={
                  <Badge variant="secondary" className={STATUS_BADGE_CLASSES[website.status]}>
                    {STATUS_LABELS[website.status]}
                  </Badge>
                }
              />
              <InfoRow
                icon={Calendar}
                label="Created At"
                value={formatDate(website.createdAt)}
              />
              <InfoRow
                icon={Calendar}
                label="Updated At"
                value={formatDate(website.updatedAt)}
              />
              <InfoRow
                icon={User}
                label="Created By"
                value={website.creator?.name || website.creator?.email || '-'}
              />
              <InfoRow
                icon={User}
                label="Last Checked By"
                value={website.checker?.name || website.checker?.email || '-'}
              />
            </div>
            {website.notes && (
              <InfoRow
                icon={FileText}
                label="Notes"
                value={<p className="whitespace-pre-wrap">{website.notes}</p>}
                className="col-span-2"
              />
            )}
          </div>

          <Separator />

          {/* Metrics */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Metrics
            </h3>
            {metrics ? (
              <div className="space-y-4">
                {/* Traffic & DA */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Traffic</p>
                    <p className="text-2xl font-bold">{formatTraffic(metrics.traffic)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Domain Authority (DA)</p>
                    <p className={`text-2xl font-bold ${
                      metrics.DA
                        ? metrics.DA >= 30
                          ? 'text-green-600'
                          : metrics.DA >= 15
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        : ''
                    }`}>
                      {metrics.DA ?? '-'}
                    </p>
                  </div>
                </div>

                {/* Captcha */}
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow
                    icon={Shield}
                    label="Captcha Type"
                    value={
                      metrics.captcha_type ? (
                        metrics.captcha_type === 'captcha' ? (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            Captcha Required
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Normal (No Captcha)
                          </Badge>
                        )
                      ) : '-'
                    }
                  />
                  <InfoRow
                    icon={Link2}
                    label="Text Link"
                    value={
                      metrics.text_link ? (
                        <Badge variant="outline">
                          {metrics.text_link === 'no' ? 'No Link' :
                           metrics.text_link === 'href' ? 'Href' :
                           metrics.text_link === 'markdown' ? 'Markdown' : 'BBCode'}
                        </Badge>
                      ) : '-'
                    }
                  />
                </div>

                {/* Username & Email Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow
                    icon={User}
                    label="Username"
                    value={
                      metrics.username ? (
                        <Badge variant="outline" className={
                          metrics.username === 'unique'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : metrics.username === 'duplicate'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                        }>
                          {metrics.username === 'unique' ? 'Unique' : metrics.username === 'duplicate' ? 'Duplicate' : 'No'}
                        </Badge>
                      ) : '-'
                    }
                  />
                  <InfoRow
                    icon={Mail}
                    label="Email"
                    value={
                      metrics.email ? (
                        <Badge variant="outline" className={
                          metrics.email === 'multi'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }>
                          {metrics.email === 'multi' ? 'Multi Email' : 'No Multi'}
                        </Badge>
                      ) : '-'
                    }
                  />
                </div>

                {/* Gmail Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow
                    icon={Mail}
                    label="Required Gmail"
                    value={<MetricBadge value={metrics.required_gmail} yesLabel="Required" noLabel="Not Required" />}
                  />
                </div>

                {/* Verification & About */}
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow
                    icon={CheckCircle}
                    label="Verify"
                    value={<MetricBadge value={metrics.verify} yesLabel="Yes" noLabel="No" />}
                  />
                  <InfoRow
                    icon={FileText}
                    label="About"
                    value={
                      metrics.about ? (
                        <Badge variant="outline" className={
                          metrics.about === 'no_stacking'
                            ? 'bg-gray-50 text-gray-600 border-gray-200'
                            : metrics.about === 'long_about'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                        }>
                          {metrics.about === 'stacking_post' ? 'Stacking Post' : metrics.about === 'stacking_about' ? 'Stacking About' : metrics.about === 'long_about' ? 'Long About' : 'No Stacking'}
                          {metrics.about_max_chars ? ` (${metrics.about_max_chars} chars)` : ''}
                        </Badge>
                      ) : '-'
                    }
                  />
                </div>

                {/* Avatar & Cover */}
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow
                    icon={Image}
                    label="Avatar"
                    value={<MetricBadge value={metrics.avatar} yesLabel="Yes" noLabel="No" />}
                  />
                  <InfoRow
                    icon={Image}
                    label="Cover"
                    value={<MetricBadge value={metrics.cover} yesLabel="Yes" noLabel="No" />}
                  />
                </div>

                {/* Social Connect */}
                {metrics.social_connect && metrics.social_connect.length > 0 && (
                  <InfoRow
                    icon={Users}
                    label="Social Connect"
                    value={
                      <div className="flex flex-wrap gap-1">
                        {metrics.social_connect.map((social) => (
                          <Badge key={social} variant="outline" className="capitalize">
                            {social}
                          </Badge>
                        ))}
                      </div>
                    }
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No metrics available</p>
            )}
          </div>

          <Separator />

          {/* Additional Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Additional Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow
                icon={Activity}
                label="Priority"
                value={website.priority}
              />
              <InfoRow
                icon={FileText}
                label="Category"
                value={website.category || '-'}
              />
              <InfoRow
                icon={Calendar}
                label="Last Tested At"
                value={formatDate(website.lastTestedAt)}
              />
              <InfoRow
                icon={Calendar}
                label="Last Used At"
                value={formatDate(website.lastUsedAt)}
              />
            </div>
            {website.tags && website.tags.length > 0 && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Tags</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {website.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
