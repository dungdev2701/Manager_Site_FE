'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Trash2,
  Edit,
  Eye,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowDown,
  ArrowUp,
  X,
  Download,
  Settings2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { AddWebsiteDialog } from '@/components/websites/add-website-dialog';
import { WebsiteDetailDialog } from '@/components/websites/website-detail-dialog';
import { EditWebsiteDialog } from '@/components/websites/edit-website-dialog';
import { websiteApi } from '@/lib/api';
import { Website, WebsiteStatus, WebsiteType, WebsiteMetrics, WebsiteFilters } from '@/types';

const statusColors: Record<WebsiteStatus, string> = {
  [WebsiteStatus.NEW]: 'bg-blue-100 text-blue-800',
  [WebsiteStatus.CHECKING]: 'bg-yellow-100 text-yellow-800',
  [WebsiteStatus.HANDING]: 'bg-orange-100 text-orange-800',
  [WebsiteStatus.PENDING]: 'bg-purple-100 text-purple-800',
  [WebsiteStatus.RUNNING]: 'bg-green-100 text-green-800',
  [WebsiteStatus.ERROR]: 'bg-red-100 text-red-800',
  [WebsiteStatus.MAINTENANCE]: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<WebsiteStatus, string> = {
  [WebsiteStatus.NEW]: 'New',
  [WebsiteStatus.CHECKING]: 'Checking',
  [WebsiteStatus.HANDING]: 'Handing',
  [WebsiteStatus.PENDING]: 'Pending',
  [WebsiteStatus.RUNNING]: 'Running',
  [WebsiteStatus.ERROR]: 'Error',
  [WebsiteStatus.MAINTENANCE]: 'Maintenance',
};

const typeColors: Record<WebsiteType, string> = {
  [WebsiteType.ENTITY]: 'bg-blue-100 text-blue-800',
  [WebsiteType.BLOG2]: 'bg-purple-100 text-purple-800',
  [WebsiteType.PODCAST]: 'bg-pink-100 text-pink-800',
  [WebsiteType.SOCIAL]: 'bg-cyan-100 text-cyan-800',
};

const typeLabels: Record<WebsiteType, string> = {
  [WebsiteType.ENTITY]: 'Entity',
  [WebsiteType.BLOG2]: 'Blog 2.0',
  [WebsiteType.PODCAST]: 'Podcast',
  [WebsiteType.SOCIAL]: 'Social',
};

function formatTraffic(traffic?: number): string {
  if (!traffic) return '-';
  if (traffic >= 1000000) return `${(traffic / 1000000).toFixed(1)}M`;
  if (traffic >= 1000) return `${(traffic / 1000).toFixed(1)}K`;
  return traffic.toString();
}

function formatSuccessRate(rate?: number | null, totalAttempts?: number): { text: string; color: string } {
  if (rate === null || rate === undefined || !totalAttempts) {
    return { text: '-', color: '' };
  }
  // rate đã là percentage (0-100) từ backend
  const percentage = Math.round(rate);
  let color = 'text-red-600';
  if (percentage >= 80) {
    color = 'text-green-600';
  } else if (percentage >= 50) {
    color = 'text-yellow-600';
  }
  return { text: `${percentage}%`, color };
}

function CaptchaBadge({ metrics }: { metrics: WebsiteMetrics }) {
  if (!metrics.captcha_type) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (metrics.captcha_type === 'captcha') {
    const providerLabel = metrics.captcha_provider === 'recaptcha'
      ? 'ReCaptcha'
      : metrics.captcha_provider === 'hcaptcha'
        ? 'hCaptcha'
        : 'Unknown';

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 cursor-default">
            <ShieldAlert className="h-3 w-3 mr-1" />
            Captcha
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{providerLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Normal type
  const cloudflareLabel = metrics.cloudflare ? 'Cloudflare' : 'No Cloudflare';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 cursor-default">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Normal
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{cloudflareLabel}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function IndexBadge({ index }: { index?: 'yes' | 'no' }) {
  if (!index) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (index === 'yes') {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        Yes
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
      No
    </Badge>
  );
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const defaultFilters: WebsiteFilters = {
  sortBy: 'traffic',
  sortOrder: 'desc',
};

// Column definitions
type ColumnId =
  | 'domain'
  | 'type'
  | 'status'
  | 'traffic'
  | 'DA'
  | 'index'
  | 'captcha'
  | 'captchaProvider'
  | 'username'
  | 'email'
  | 'requiredGmail'
  | 'verify'
  | 'about'
  | 'textLink'
  | 'socialConnect'
  | 'avatar'
  | 'cover'
  | 'creator'
  | 'checker'
  | 'createdAt'
  | 'updatedAt'
  | 'lastTestedAt'
  | 'lastUsedAt'
  | 'notes'
  | 'priority'
  | 'category'
  | 'tags'
  | 'successRate';

interface ColumnDef {
  id: ColumnId;
  label: string;
  group: 'basic' | 'metrics' | 'additional' | 'dates';
  width?: string;
  align?: 'left' | 'center' | 'right';
}

const ALL_COLUMNS: ColumnDef[] = [
  // Basic Information
  { id: 'domain', label: 'Domain', group: 'basic', width: 'w-[180px]', align: 'left' },
  { id: 'type', label: 'Type', group: 'basic', width: 'w-[100px]', align: 'center' },
  { id: 'status', label: 'Status', group: 'basic', width: 'w-[120px]', align: 'center' },
  { id: 'priority', label: 'Priority', group: 'basic', width: 'w-[80px]', align: 'center' },
  { id: 'category', label: 'Category', group: 'basic', width: 'w-[120px]', align: 'center' },
  { id: 'tags', label: 'Tags', group: 'basic', width: 'w-[150px]', align: 'center' },
  { id: 'notes', label: 'Notes', group: 'basic', width: 'w-[200px]', align: 'left' },

  // Metrics
  { id: 'traffic', label: 'Traffic', group: 'metrics', width: 'w-[100px]', align: 'center' },
  { id: 'DA', label: 'DA', group: 'metrics', width: 'w-[80px]', align: 'center' },
  { id: 'index', label: 'Index', group: 'metrics', width: 'w-[80px]', align: 'center' },
  { id: 'captcha', label: 'Captcha', group: 'metrics', width: 'w-[120px]', align: 'center' },
  { id: 'captchaProvider', label: 'Captcha Provider', group: 'metrics', width: 'w-[140px]', align: 'center' },
  { id: 'username', label: 'Username', group: 'metrics', width: 'w-[100px]', align: 'center' },
  { id: 'email', label: 'Email', group: 'metrics', width: 'w-[100px]', align: 'center' },
  { id: 'requiredGmail', label: 'Required Gmail', group: 'metrics', width: 'w-[120px]', align: 'center' },
  { id: 'verify', label: 'Verify', group: 'metrics', width: 'w-[80px]', align: 'center' },
  { id: 'about', label: 'About', group: 'metrics', width: 'w-[150px]', align: 'center' },
  { id: 'textLink', label: 'Text Link', group: 'metrics', width: 'w-[100px]', align: 'center' },
  { id: 'socialConnect', label: 'Social Connect', group: 'metrics', width: 'w-[150px]', align: 'center' },
  { id: 'avatar', label: 'Avatar', group: 'metrics', width: 'w-[80px]', align: 'center' },
  { id: 'cover', label: 'Cover', group: 'metrics', width: 'w-[80px]', align: 'center' },

  // Additional
  { id: 'creator', label: 'Creator', group: 'additional', width: 'w-[120px]', align: 'center' },
  { id: 'checker', label: 'Checker', group: 'additional', width: 'w-[120px]', align: 'center' },
  { id: 'successRate', label: 'Success Rate', group: 'additional', width: 'w-[100px]', align: 'center' },

  // Dates
  { id: 'createdAt', label: 'Created At', group: 'dates', width: 'w-[150px]', align: 'center' },
  { id: 'updatedAt', label: 'Updated At', group: 'dates', width: 'w-[150px]', align: 'center' },
  { id: 'lastTestedAt', label: 'Last Tested', group: 'dates', width: 'w-[150px]', align: 'center' },
  { id: 'lastUsedAt', label: 'Last Used', group: 'dates', width: 'w-[150px]', align: 'center' },
];

const DEFAULT_VISIBLE_COLUMNS: ColumnId[] = [
  'domain',
  'type',
  'status',
  'traffic',
  'DA',
  'index',
  'captcha',
  'creator',
  'checker',
  'successRate',
];

const COLUMN_GROUPS = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'additional', label: 'Additional' },
  { id: 'dates', label: 'Dates' },
] as const;

const STORAGE_KEY = 'websites-visible-columns';

function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  return format(new Date(date), 'dd/MM/yyyy HH:mm');
}

export default function WebsitesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [filters, setFilters] = useState<WebsiteFilters>(defaultFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectAllPages, setIsSelectAllPages] = useState(false); // Select all across all pages
  const [isLoadingSelectAll, setIsLoadingSelectAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const queryClient = useQueryClient();

  // Load visible columns from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ColumnId[];
        // Validate that all saved columns still exist
        const validColumns = parsed.filter((id) => ALL_COLUMNS.some((col) => col.id === id));
        if (validColumns.length > 0) {
          setVisibleColumns(validColumns);
        }
      } catch {
        // Invalid JSON, use defaults
      }
    }
  }, []);

  // Save visible columns to localStorage
  const saveVisibleColumns = useCallback((columns: ColumnId[]) => {
    setVisibleColumns(columns);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  }, []);

  const toggleColumn = useCallback((columnId: ColumnId) => {
    setVisibleColumns((prev) => {
      const newColumns = prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newColumns));
      return newColumns;
    });
  }, []);

  const resetColumns = useCallback(() => {
    saveVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
  }, [saveVisibleColumns]);

  // Get visible column definitions in order
  const visibleColumnDefs = useMemo(() => {
    return ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id));
  }, [visibleColumns]);

  // Render cell content based on column id
  const renderCellContent = useCallback((columnId: ColumnId, website: Website) => {
    const metrics = website.metrics;

    switch (columnId) {
      case 'domain':
        return <span className="font-medium">{website.domain}</span>;

      case 'type':
        return (
          <Badge variant="secondary" className={typeColors[website.type]}>
            {typeLabels[website.type]}
          </Badge>
        );

      case 'status':
        return (
          <Badge variant="secondary" className={statusColors[website.status]}>
            {statusLabels[website.status]}
          </Badge>
        );

      case 'traffic':
        return <span className="font-medium">{formatTraffic(metrics?.traffic)}</span>;

      case 'DA':
        return (
          <span
            className={`font-medium ${
              metrics?.DA
                ? metrics.DA >= 30
                  ? 'text-green-600'
                  : metrics.DA >= 15
                    ? 'text-yellow-600'
                    : 'text-red-600'
                : ''
            }`}
          >
            {metrics?.DA ?? '-'}
          </span>
        );

      case 'index':
        return <IndexBadge index={metrics?.index} />;

      case 'captcha':
        return metrics ? (
          <CaptchaBadge metrics={metrics} />
        ) : (
          <span className="text-muted-foreground">-</span>
        );

      case 'captchaProvider':
        if (!metrics?.captcha_type) return <span className="text-muted-foreground">-</span>;
        if (metrics.captcha_type === 'captcha') {
          return (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              {metrics.captcha_provider === 'recaptcha' ? 'reCaptcha' : metrics.captcha_provider === 'hcaptcha' ? 'hCaptcha' : '-'}
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className={metrics.cloudflare ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-600 border-gray-200'}>
            {metrics.cloudflare ? 'Cloudflare' : 'None'}
          </Badge>
        );

      case 'username':
        if (!metrics?.username) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge
            variant="outline"
            className={
              metrics.username === 'unique'
                ? 'bg-green-50 text-green-700 border-green-200'
                : metrics.username === 'duplicate'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
            }
          >
            {metrics.username === 'unique' ? 'Unique' : metrics.username === 'duplicate' ? 'Duplicate' : 'No'}
          </Badge>
        );

      case 'email':
        if (!metrics?.email) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge
            variant="outline"
            className={metrics.email === 'multi' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}
          >
            {metrics.email === 'multi' ? 'Multi' : 'No Multi'}
          </Badge>
        );

      case 'requiredGmail':
        if (!metrics?.required_gmail) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge
            variant="outline"
            className={metrics.required_gmail === 'yes' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'}
          >
            {metrics.required_gmail === 'yes' ? 'Required' : 'Not Required'}
          </Badge>
        );

      case 'verify':
        if (!metrics?.verify) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge
            variant="outline"
            className={metrics.verify === 'yes' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}
          >
            {metrics.verify === 'yes' ? 'Yes' : 'No'}
          </Badge>
        );

      case 'about':
        if (!metrics?.about) return <span className="text-muted-foreground">-</span>;
        const aboutLabel = metrics.about === 'stacking_post' ? 'Stack Post'
          : metrics.about === 'stacking_about' ? 'Stack About'
          : metrics.about === 'long_about' ? 'Long About'
          : 'No Stack';
        const aboutColor = metrics.about === 'no_stacking'
          ? 'bg-gray-50 text-gray-600 border-gray-200'
          : metrics.about === 'long_about'
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-purple-50 text-purple-700 border-purple-200';
        return (
          <Badge variant="outline" className={aboutColor}>
            {aboutLabel}
            {metrics.about_max_chars ? ` (${metrics.about_max_chars})` : ''}
          </Badge>
        );

      case 'textLink':
        if (!metrics?.text_link) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge variant="outline">
            {metrics.text_link === 'no' ? 'No' : metrics.text_link === 'href' ? 'Href' : metrics.text_link === 'markdown' ? 'Markdown' : 'BBCode'}
          </Badge>
        );

      case 'socialConnect':
        if (!metrics?.social_connect || metrics.social_connect.length === 0) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="flex flex-wrap gap-1 justify-center">
            {metrics.social_connect.map((social) => (
              <Badge key={social} variant="outline" className="text-xs capitalize">
                {social}
              </Badge>
            ))}
          </div>
        );

      case 'avatar':
        if (!metrics?.avatar) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge
            variant="outline"
            className={metrics.avatar === 'yes' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}
          >
            {metrics.avatar === 'yes' ? 'Yes' : 'No'}
          </Badge>
        );

      case 'cover':
        if (!metrics?.cover) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge
            variant="outline"
            className={metrics.cover === 'yes' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}
          >
            {metrics.cover === 'yes' ? 'Yes' : 'No'}
          </Badge>
        );

      case 'creator':
        return website.creator ? (
          <span className="text-sm">{website.creator.name || website.creator.email}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );

      case 'checker':
        return website.checker ? (
          <span className="text-sm">{website.checker.name}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );

      case 'successRate': {
        const { text, color } = formatSuccessRate(website.successRate, website.totalAttempts);
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`font-medium cursor-default ${color}`}>{text}</span>
            </TooltipTrigger>
            {website.totalAttempts ? (
              <TooltipContent>
                <p>{website.totalAttempts} attempts</p>
              </TooltipContent>
            ) : null}
          </Tooltip>
        );
      }

      case 'createdAt':
        return <span className="text-sm">{formatDate(website.createdAt)}</span>;

      case 'updatedAt':
        return <span className="text-sm">{formatDate(website.updatedAt)}</span>;

      case 'lastTestedAt':
        return <span className="text-sm">{formatDate(website.lastTestedAt)}</span>;

      case 'lastUsedAt':
        return <span className="text-sm">{formatDate(website.lastUsedAt)}</span>;

      case 'notes':
        if (!website.notes) return <span className="text-muted-foreground">-</span>;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm truncate max-w-[180px] block cursor-default">{website.notes}</span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="whitespace-pre-wrap">{website.notes}</p>
            </TooltipContent>
          </Tooltip>
        );

      case 'priority':
        return <span className="text-sm">{website.priority ?? '-'}</span>;

      case 'category':
        return website.category ? (
          <Badge variant="outline">{website.category}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );

      case 'tags':
        if (!website.tags || website.tags.length === 0) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="flex flex-wrap gap-1 justify-center">
            {website.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {website.tags.length > 2 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs cursor-default">
                    +{website.tags.length - 2}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{website.tags.slice(2).join(', ')}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );

      default:
        return <span className="text-muted-foreground">-</span>;
    }
  }, []);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const { data, isLoading, error } = useQuery({
    queryKey: ['websites', search, page, pageSize, filters],
    queryFn: () => websiteApi.getAll({ search, page, limit: pageSize, ...filters }),
  });

  const clearFilters = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  const updateFilter = <K extends keyof WebsiteFilters>(key: K, value: WebsiteFilters[K] | undefined | null) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (value === undefined || value === null) {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      // If captcha_type is cleared or changed to 'normal', clear captcha_provider
      if (key === 'captcha_type' && value !== 'captcha') {
        delete newFilters.captcha_provider;
      }
      return newFilters;
    });
    setPage(1);
  };

  const totalPages = data?.meta?.totalPages || 1;
  const total = data?.meta?.total || 0;

  const deleteMutation = useMutation({
    mutationFn: websiteApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      toast.success('Website moved to trash. It will be permanently deleted after 30 days.');
    },
    onError: () => {
      toast.error('Failed to delete website');
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to move this website to trash? It will be permanently deleted after 30 days.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleView = (website: Website) => {
    setSelectedWebsite(website);
    setIsDetailDialogOpen(true);
  };

  const handleEdit = (website: Website) => {
    setSelectedWebsite(website);
    setIsEditDialogOpen(true);
  };

  // Selection handlers
  const currentPageIds = data?.websites.map((w) => w.id) || [];
  const allPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.has(id));
  const someSelected = currentPageIds.some((id) => selectedIds.has(id));
  const showSelectAllBanner = allPageSelected && !isSelectAllPages && total > currentPageIds.length;

  const handleSelectAllPage = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set([...selectedIds, ...currentPageIds]));
    } else {
      // Deselect all including all pages mode
      setIsSelectAllPages(false);
      const newSet = new Set(selectedIds);
      currentPageIds.forEach((id) => newSet.delete(id));
      setSelectedIds(newSet);
    }
  };

  const handleSelectAllPages = async () => {
    setIsLoadingSelectAll(true);
    try {
      const result = await websiteApi.getAllIds({ search, ...filters });
      setSelectedIds(new Set(result.ids));
      setIsSelectAllPages(true);
      toast.success(`Selected all ${result.total} websites`);
    } catch {
      toast.error('Failed to select all websites');
    } finally {
      setIsLoadingSelectAll(false);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
      // If deselecting one, exit select all mode
      setIsSelectAllPages(false);
    }
    setSelectedIds(newSet);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectAllPages(false);
  };

  // Helper function to format website for export
  const formatWebsiteForExport = (website: Website) => {
    const metrics = website.metrics || {};

    // Format captcha info
    let captchaValue = '';
    if (metrics.captcha_type === 'captcha') {
      captchaValue = 'Captcha';
    } else if (metrics.captcha_type === 'normal') {
      captchaValue = 'Normal';
    }

    // Format kiểu captcha
    let captchaTypeValue = '';
    if (metrics.captcha_provider === 'recaptcha') {
      captchaTypeValue = 'Recaptcha';
    } else if (metrics.captcha_provider === 'hcaptcha') {
      captchaTypeValue = 'HCaptcha';
    } else if (metrics.cloudflare) {
      captchaTypeValue = 'Cloudflare';
    } else if (metrics.captcha_type) {
      captchaTypeValue = 'No';
    }

    // Format username
    let usernameValue = '';
    if (metrics.username === 'unique') {
      usernameValue = 'Unique';
    } else if (metrics.username === 'duplicate') {
      usernameValue = 'Duplicate';
    } else if (metrics.username === 'no') {
      usernameValue = 'No';
    }

    // Format email
    let emailValue = '';
    if (metrics.email === 'multi') {
      emailValue = 'Multi';
    } else if (metrics.email === 'no_multi') {
      emailValue = 'No Multi';
    }

    // Format about
    let aboutValue = '';
    if (metrics.about === 'no_stacking') {
      aboutValue = 'No Stacking';
    } else if (metrics.about === 'stacking_post') {
      aboutValue = 'Stacking Post';
    } else if (metrics.about === 'stacking_about') {
      aboutValue = 'Stacking About';
    }

    // Format text link
    let textLinkValue = '';
    if (metrics.text_link === 'no') {
      textLinkValue = 'No';
    } else if (metrics.text_link === 'href') {
      textLinkValue = 'Hrefs';
    } else if (metrics.text_link === 'markdown') {
      textLinkValue = 'Markdown';
    } else if (metrics.text_link === 'BBCode') {
      textLinkValue = 'BBCode';
    }

    // Format social connect
    const socialValue = metrics.social_connect?.length
      ? metrics.social_connect.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
      : 'No';

    return {
      domain: website.domain,
      Type: typeLabels[website.type] || website.type,
      index: metrics.index === 'yes' ? 'Yes' : metrics.index === 'no' ? 'No' : '',
      traffic: metrics.traffic ? formatTraffic(metrics.traffic) : '',
      DA: metrics.DA ?? '',
      Captcha: captchaValue,
      'kiểu Captcha': captchaTypeValue,
      username: usernameValue,
      Email: emailValue,
      verify: metrics.verify === 'yes' ? 'Yes' : metrics.verify === 'no' ? 'No' : '',
      About: aboutValue,
      'Text Link': textLinkValue,
      'Social Connect': socialValue,
      Avatar: metrics.avatar === 'yes' ? 'Yes' : metrics.avatar === 'no' ? 'No' : '',
      Cover: metrics.cover === 'yes' ? 'Yes' : metrics.cover === 'no' ? 'No' : '',
      Status: website.status,
    };
  };

  // Export websites to Excel file
  const exportToExcel = (websites: Website[]) => {
    const exportData = websites.map(formatWebsiteForExport);

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Websites');

    // Auto-size columns
    const colWidths = [
      { wch: 30 }, // domain
      { wch: 10 }, // Type
      { wch: 8 },  // index
      { wch: 10 }, // traffic
      { wch: 5 },  // DA
      { wch: 10 }, // Captcha
      { wch: 12 }, // kiểu Captcha
      { wch: 10 }, // username
      { wch: 10 }, // Email
      { wch: 8 },  // verify
      { wch: 15 }, // About
      { wch: 12 }, // Text Link
      { wch: 30 }, // Social Connect
      { wch: 8 },  // Avatar
      { wch: 8 },  // Cover
      { wch: 12 }, // Status
    ];
    worksheet['!cols'] = colWidths;

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `websites_export_${date}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
    toast.success(`Exported ${websites.length} websites to ${filename}`);
  };

  // Export to Excel
  const handleExport = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one website to export');
      return;
    }

    setIsExporting(true);

    try {
      // If selecting more websites than on current page, fetch from API
      const currentPageSelectedIds = currentPageIds.filter((id) => selectedIds.has(id));
      const needsFetch = selectedIds.size > currentPageSelectedIds.length;

      if (needsFetch) {
        // Fetch all selected websites from API
        const idsArray = Array.from(selectedIds);
        const result = await websiteApi.getByIds(idsArray);
        exportToExcel(result.websites);
      } else {
        // Use websites from current page
        const selectedWebsites = data?.websites.filter((w) => selectedIds.has(w.id)) || [];
        if (selectedWebsites.length === 0) {
          toast.error('No websites selected');
          return;
        }
        exportToExcel(selectedWebsites);
      }
    } catch {
      toast.error('Failed to export websites');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Websites</h1>
          <p className="text-muted-foreground">Manage and monitor your websites</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Website
        </Button>
      </div>

      <AddWebsiteDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      <WebsiteDetailDialog
        website={selectedWebsite}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
      />
      <EditWebsiteDialog
        website={selectedWebsite}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search websites..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset to first page when searching
            }}
            className="pl-9"
          />
        </div>

        {/* Selection info and actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button variant="default" size="sm" onClick={handleExport} disabled={isExporting}>
              <Download className="h-4 w-4 mr-1" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        )}

        {/* Column Selector */}
        <Popover open={isColumnSelectorOpen} onOpenChange={setIsColumnSelectorOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Settings2 className="h-4 w-4" />
              {visibleColumns.length !== DEFAULT_VISIBLE_COLUMNS.length && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                  {visibleColumns.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Columns</h4>
                <Button variant="ghost" size="sm" onClick={resetColumns} className="h-auto p-1 text-xs">
                  Reset
                </Button>
              </div>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {COLUMN_GROUPS.map((group) => {
                  const groupColumns = ALL_COLUMNS.filter((col) => col.group === group.id);
                  return (
                    <div key={group.id} className="space-y-2">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {group.label}
                      </h5>
                      <div className="grid grid-cols-2 gap-2">
                        {groupColumns.map((col) => (
                          <label
                            key={col.id}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                          >
                            <Checkbox
                              checked={visibleColumns.includes(col.id)}
                              onCheckedChange={() => toggleColumn(col.id)}
                              disabled={col.id === 'domain'} // Domain is always required
                            />
                            <span className={col.id === 'domain' ? 'text-muted-foreground' : ''}>
                              {col.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-muted-foreground border-t pt-2">
                {visibleColumns.length} of {ALL_COLUMNS.length} columns visible
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters & Sort</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-1 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>

              {/* Sort by */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Sort by</Label>
                <div className="flex gap-2">
                  <Select
                    value={filters.sortBy || ''}
                    onValueChange={(value) => updateFilter('sortBy', value as WebsiteFilters['sortBy'] || undefined)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="traffic">Traffic</SelectItem>
                      <SelectItem value="DA">DA</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="createdAt">Created Date</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.sortOrder || ''}
                    onValueChange={(value) => updateFilter('sortOrder', value as WebsiteFilters['sortOrder'] || undefined)}
                    disabled={!filters.sortBy}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">
                        <span className="flex items-center gap-1">
                          <ArrowDown className="h-3 w-3" /> High
                        </span>
                      </SelectItem>
                      <SelectItem value="asc">
                        <span className="flex items-center gap-1">
                          <ArrowUp className="h-3 w-3" /> Low
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Type filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select
                  value={filters.type || ''}
                  onValueChange={(value) => updateFilter('type', value as WebsiteFilters['type'] || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={WebsiteType.ENTITY}>Entity</SelectItem>
                    <SelectItem value={WebsiteType.BLOG2}>Blog 2.0</SelectItem>
                    <SelectItem value={WebsiteType.PODCAST}>Podcast</SelectItem>
                    <SelectItem value={WebsiteType.SOCIAL}>Social</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={filters.status || ''}
                  onValueChange={(value) => updateFilter('status', value as WebsiteFilters['status'] || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={WebsiteStatus.NEW}>New</SelectItem>
                    <SelectItem value={WebsiteStatus.CHECKING}>Checking</SelectItem>
                    <SelectItem value={WebsiteStatus.HANDING}>Handing</SelectItem>
                    <SelectItem value={WebsiteStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={WebsiteStatus.RUNNING}>Running</SelectItem>
                    <SelectItem value={WebsiteStatus.ERROR}>Error</SelectItem>
                    <SelectItem value={WebsiteStatus.MAINTENANCE}>Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Index filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Index</Label>
                <Select
                  value={filters.index || ''}
                  onValueChange={(value) => updateFilter('index', value as WebsiteFilters['index'] || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Captcha filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Captcha</Label>
                <div className="flex gap-2">
                  <Select
                    value={filters.captcha_type || ''}
                    onValueChange={(value) => updateFilter('captcha_type', value as WebsiteFilters['captcha_type'] || undefined)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="captcha">Captcha</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                  {filters.captcha_type === 'captcha' && (
                    <Select
                      value={filters.captcha_provider || ''}
                      onValueChange={(value) => updateFilter('captcha_provider', value as WebsiteFilters['captcha_provider'] || undefined)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recaptcha">reCaptcha</SelectItem>
                        <SelectItem value="hcaptcha">hCaptcha</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Required Gmail filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Required Gmail</Label>
                <Select
                  value={filters.required_gmail || ''}
                  onValueChange={(value) => updateFilter('required_gmail', value as WebsiteFilters['required_gmail'] || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Verify filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Verify</Label>
                <Select
                  value={filters.verify || ''}
                  onValueChange={(value) => updateFilter('verify', value as WebsiteFilters['verify'] || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Select All Banner */}
      {showSelectAllBanner && (
        <div className="flex items-center justify-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <span className="text-sm text-blue-700">
            All {currentPageIds.length} websites on this page are selected.
          </span>
          <Button
            variant="link"
            size="sm"
            className="text-blue-700 font-medium h-auto p-0"
            onClick={handleSelectAllPages}
            disabled={isLoadingSelectAll}
          >
            {isLoadingSelectAll ? 'Loading...' : `Select all ${total} websites`}
          </Button>
        </div>
      )}

      {/* Select All Pages Active Banner */}
      {isSelectAllPages && (
        <div className="flex items-center justify-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <span className="text-sm text-green-700">
            All {selectedIds.size} websites are selected.
          </span>
          <Button
            variant="link"
            size="sm"
            className="text-green-700 font-medium h-auto p-0"
            onClick={clearSelection}
          >
            Clear selection
          </Button>
        </div>
      )}

      <div className="rounded-md border overflow-auto max-h-[calc(100vh-320px)] scrollbar-thin">
        <Table containerClassName="">
          <TableHeader className="sticky top-0 bg-background z-10 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allPageSelected || isSelectAllPages}
                  onCheckedChange={(checked) => handleSelectAllPage(checked as boolean)}
                  aria-label="Select all on this page"
                  className={someSelected && !allPageSelected ? 'opacity-50' : ''}
                />
              </TableHead>
              {visibleColumnDefs.map((col) => (
                <TableHead
                  key={col.id}
                  className={`${col.width || ''} ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  {visibleColumnDefs.map((col) => (
                    <TableCell key={col.id}>
                      <Skeleton className="h-6 w-16 mx-auto" />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && error && (
              <TableRow>
                <TableCell colSpan={visibleColumnDefs.length + 2} className="text-center text-muted-foreground py-8">
                  Failed to load websites. Please try again.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !error && data?.websites.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleColumnDefs.length + 2} className="text-center text-muted-foreground py-8">
                  No websites found. Add your first website to get started.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              !error &&
              data?.websites.map((website: Website) => (
                <TableRow key={website.id} className={selectedIds.has(website.id) ? 'bg-muted/50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(website.id)}
                      onCheckedChange={(checked) => handleSelectOne(website.id, checked as boolean)}
                      aria-label={`Select ${website.domain}`}
                    />
                  </TableCell>
                  {visibleColumnDefs.map((col) => (
                    <TableCell
                      key={col.id}
                      className={col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''}
                    >
                      {renderCellContent(col.id, website)}
                    </TableCell>
                  ))}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(website)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(website)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(website.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1); // Reset to first page when changing page size
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize.toString()} />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>of {total} websites</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(1)}
            disabled={page === 1 || isLoading}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(page - 1)}
            disabled={page === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 px-2">
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages || isLoading}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
