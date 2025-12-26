'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Trash2,
  Edit,
  Eye,
  Info,
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
import { Website, WebsiteStatus, WebsiteMetrics, WebsiteFilters } from '@/types';

const statusColors: Record<WebsiteStatus, string> = {
  [WebsiteStatus.RUNNING]: 'bg-green-100 text-green-800',
  [WebsiteStatus.ABANDONED]: 'bg-gray-100 text-gray-800',
  [WebsiteStatus.TESTED]: 'bg-blue-100 text-blue-800',
  [WebsiteStatus.UNTESTED]: 'bg-yellow-100 text-yellow-800',
  [WebsiteStatus.PENDING]: 'bg-orange-100 text-orange-800',
  [WebsiteStatus.MAINTENANCE]: 'bg-purple-100 text-purple-800',
  [WebsiteStatus.ERROR]: 'bg-red-100 text-red-800',
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
  const percentage = Math.round(rate * 100);
  let color = 'text-red-600';
  if (percentage >= 80) {
    color = 'text-green-600';
  } else if (percentage >= 50) {
    color = 'text-yellow-600';
  }
  return { text: `${percentage}%`, color };
}

function MetricsDetailsTooltip({ metrics }: { metrics: WebsiteMetrics }) {
  const aboutValue = metrics.about
    ? metrics.about_max_chars
      ? `${metrics.about} (${metrics.about_max_chars} chars)`
      : metrics.about
    : undefined;

  const details = [
    { label: 'Email', value: metrics.email },
    { label: 'Required Gmail', value: metrics.required_gmail },
    { label: 'Verify', value: metrics.verify },
    { label: 'About', value: aboutValue },
    { label: 'Text Link', value: metrics.text_link },
    {
      label: 'Social',
      value: metrics.social_connect?.join(', ') || undefined,
    },
    { label: 'Avatar', value: metrics.avatar },
    { label: 'Cover', value: metrics.cover },
  ].filter((d) => d.value);

  if (details.length === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Info className="h-4 w-4 text-muted-foreground" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-semibold text-xs mb-2">Details</p>
          {details.map((detail) => (
            <div key={detail.label} className="flex justify-between gap-4 text-xs">
              <span className="text-muted-foreground">{detail.label}:</span>
              <span className="font-medium">{detail.value}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
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

const defaultFilters: WebsiteFilters = {};

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
  const queryClient = useQueryClient();

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="flex items-center gap-4">
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
                    <SelectItem value={WebsiteStatus.RUNNING}>Running</SelectItem>
                    <SelectItem value={WebsiteStatus.TESTED}>Tested</SelectItem>
                    <SelectItem value={WebsiteStatus.UNTESTED}>Untested</SelectItem>
                    <SelectItem value={WebsiteStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={WebsiteStatus.MAINTENANCE}>Maintenance</SelectItem>
                    <SelectItem value={WebsiteStatus.ABANDONED}>Abandoned</SelectItem>
                    <SelectItem value={WebsiteStatus.ERROR}>Error</SelectItem>
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allPageSelected || isSelectAllPages}
                  onCheckedChange={(checked) => handleSelectAllPage(checked as boolean)}
                  aria-label="Select all on this page"
                  className={someSelected && !allPageSelected ? 'opacity-50' : ''}
                />
              </TableHead>
              <TableHead className="min-w-[200px]">Domain</TableHead>
              <TableHead className="text-center w-[200px]">Status</TableHead>
              <TableHead className="text-center w-[160px]">Traffic</TableHead>
              <TableHead className="text-center w-[160px]">DA</TableHead>
              <TableHead className="text-center w-[120px]">Index</TableHead>
              <TableHead className="text-center w-[160px]">Captcha</TableHead>
              <TableHead className="text-center w-[160px]">Details</TableHead>
              <TableHead className="text-center w-[160px]">Checker</TableHead>
              <TableHead className="text-center w-[120px]">Success</TableHead>
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
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-10 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-6 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-10 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && error && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  Failed to load websites. Please try again.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !error && data?.websites.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
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
                  <TableCell className="font-medium">{website.domain}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className={statusColors[website.status]}>
                      {website.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">
                      {formatTraffic(website.metrics?.traffic)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`font-medium ${website.metrics?.DA
                        ? website.metrics.DA >= 30
                          ? 'text-green-600'
                          : website.metrics.DA >= 15
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        : ''
                        }`}
                    >
                      {website.metrics?.DA ?? '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <IndexBadge index={website.metrics?.index} />
                  </TableCell>
                  <TableCell className="text-center">
                    {website.metrics ? (
                      <CaptchaBadge metrics={website.metrics} />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {website.metrics ? (
                      <MetricsDetailsTooltip metrics={website.metrics} />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {website.checker ? (
                      <span className="text-sm">{website.checker.name}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {(() => {
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
                    })()}
                  </TableCell>
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
      <div className="flex items-center justify-between">
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
