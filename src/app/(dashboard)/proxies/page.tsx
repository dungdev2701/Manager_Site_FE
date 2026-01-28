'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Zap,
  CheckCircle,
  Square,
  Loader2,
  Filter,
  X,
  Download,
  RotateCcw,
  Archive,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { proxyApi, CheckProgress } from '@/lib/api';
import {
  Proxy,
  ProxyType,
  ProxyStatus,
  ProxyServiceType,
  ProxyQuery,
} from '@/types';
import { useDebounce } from '@/hooks';
import { AddProxyDialog } from '@/components/proxies/add-proxy-dialog';
import { EditProxyDialog } from '@/components/proxies/edit-proxy-dialog';

const TYPE_BADGE_CLASSES: Record<ProxyType, string> = {
  IPV4_STATIC: 'bg-blue-100 text-blue-800 border-blue-200',
  IPV6_STATIC: 'bg-purple-100 text-purple-800 border-purple-200',
  SOCKS5: 'bg-orange-100 text-orange-800 border-orange-200',
  ROTATING: 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

const TYPE_LABELS: Record<ProxyType, string> = {
  IPV4_STATIC: 'IPv4 Static',
  IPV6_STATIC: 'IPv6 Static',
  SOCKS5: 'SOCKS5',
  ROTATING: 'Rotating',
};

const STATUS_BADGE_CLASSES: Record<ProxyStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  DEAD: 'bg-red-100 text-red-800 border-red-200',
  CHECKING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  UNKNOWN: 'bg-gray-100 text-gray-800 border-gray-200',
};

const STATUS_LABELS: Record<ProxyStatus, string> = {
  ACTIVE: 'Active',
  DEAD: 'Dead',
  CHECKING: 'Checking',
  UNKNOWN: 'Unknown',
};

const SERVICE_BADGE_CLASSES: Record<ProxyServiceType, string> = {
  ENTITY: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  BLOG_2_0: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PODCAST: 'bg-violet-100 text-violet-800 border-violet-200',
  SOCIAL: 'bg-pink-100 text-pink-800 border-pink-200',
  GG_STACKING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const SERVICE_LABELS: Record<ProxyServiceType, string> = {
  ENTITY: 'Entity',
  BLOG_2_0: 'Blog 2.0',
  PODCAST: 'Podcast',
  SOCIAL: 'Social',
  GG_STACKING: 'GG Stacking',
};

function formatProxyString(proxy: Proxy): string {
  const parts = [proxy.ip, proxy.port];
  if (proxy.username) parts.push(proxy.username);
  if (proxy.password) parts.push(proxy.password);
  return parts.join(':');
}

function ProxiesPageContent() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProxyStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<ProxyType | 'ALL'>('ALL');
  const [serviceFilter, setServiceFilter] = useState<ProxyServiceType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'ip' | 'createdAt' | 'status' | 'type' | 'responseTime' | 'lastCheckedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllPages, setSelectAllPages] = useState(false);

  // Trash view
  const [isTrashView, setIsTrashView] = useState(false);

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedProxy, setSelectedProxy] = useState<Proxy | null>(null);

  // Check progress state
  const [checkProgress, setCheckProgress] = useState<CheckProgress | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Filter popover
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Confirm dialogs
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [checkConfirmOpen, setCheckConfirmOpen] = useState(false);
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [bulkPermanentDeleteDialogOpen, setBulkPermanentDeleteDialogOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // Count active filters
  const activeFilterCount = [
    statusFilter !== 'ALL' ? 1 : 0,
    typeFilter !== 'ALL' ? 1 : 0,
    serviceFilter !== 'ALL' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setServiceFilter('ALL');
    setPage(1);
  };

  const query: ProxyQuery = {
    page,
    limit,
    search: debouncedSearch || undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    type: typeFilter !== 'ALL' ? typeFilter : undefined,
    service: serviceFilter !== 'ALL' ? serviceFilter : undefined,
    sortBy,
    sortOrder,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['proxies', query],
    queryFn: () => proxyApi.getAll(query),
    enabled: !isTrashView,
  });

  // Trash query
  const { data: trashData, isLoading: isTrashLoading, isFetching: isTrashFetching } = useQuery({
    queryKey: ['proxies-trash', query],
    queryFn: () => proxyApi.getTrash(query),
    enabled: isTrashView,
  });

  const deleteMutation = useMutation({
    mutationFn: proxyApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxies'] });
      toast.success('Proxy deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedProxy(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete proxy');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: proxyApi.bulkDelete,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proxies'] });
      toast.success(`Deleted ${result.deleted} proxies`);
      setBulkDeleteDialogOpen(false);
      setSelectedIds(new Set());
      setSelectAllPages(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete proxies');
    },
  });

  const checkProxyMutation = useMutation({
    mutationFn: proxyApi.checkProxy,
    onSuccess: (proxy) => {
      queryClient.invalidateQueries({ queryKey: ['proxies'] });
      toast.success(`Proxy ${proxy.ip}:${proxy.port} - ${proxy.status}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to check proxy');
    },
  });

  const checkAllMutation = useMutation({
    mutationFn: proxyApi.checkAllProxies,
    onSuccess: (result) => {
      toast.success(`Started checking ${result.total} proxies`);
      setIsPolling(true);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start proxy check');
    },
  });

  const checkSelectedMutation = useMutation({
    mutationFn: proxyApi.checkSelectedProxies,
    onSuccess: (result) => {
      toast.success(`Started checking ${result.total} proxies`);
      setSelectedIds(new Set());
      setSelectAllPages(false);
      setIsPolling(true);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start proxy check');
    },
  });

  const stopCheckMutation = useMutation({
    mutationFn: proxyApi.stopCheck,
    onSuccess: () => {
      toast.success('Check stopped');
      setIsPolling(false);
      setCheckProgress(null);
      queryClient.invalidateQueries({ queryKey: ['proxies'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to stop check');
    },
  });

  // Restore mutations
  const restoreMutation = useMutation({
    mutationFn: proxyApi.restore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxies-trash'] });
      queryClient.invalidateQueries({ queryKey: ['proxies'] });
      toast.success('Proxy restored successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restore proxy');
    },
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: proxyApi.bulkRestore,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proxies-trash'] });
      queryClient.invalidateQueries({ queryKey: ['proxies'] });
      toast.success(`Restored ${result.restored} proxies`);
      setSelectedIds(new Set());
      setSelectAllPages(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restore proxies');
    },
  });

  // Permanent delete mutations
  const permanentDeleteMutation = useMutation({
    mutationFn: proxyApi.permanentDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxies-trash'] });
      toast.success('Proxy permanently deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to permanently delete proxy');
    },
  });

  const bulkPermanentDeleteMutation = useMutation({
    mutationFn: proxyApi.bulkPermanentDelete,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proxies-trash'] });
      toast.success(`Permanently deleted ${result.deleted} proxies`);
      setSelectedIds(new Set());
      setSelectAllPages(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to permanently delete proxies');
    },
  });

  const emptyTrashMutation = useMutation({
    mutationFn: proxyApi.emptyTrash,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['proxies-trash'] });
      toast.success(`Emptied trash: ${result.deleted} proxies deleted`);
      setSelectedIds(new Set());
      setSelectAllPages(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to empty trash');
    },
  });

  // Polling for check progress
  useEffect(() => {
    if (!isPolling) return;

    const pollProgress = async () => {
      try {
        const progress = await proxyApi.getCheckStatus();
        setCheckProgress(progress);

        if (!progress.isRunning) {
          setIsPolling(false);
          setCheckProgress(null);
          queryClient.invalidateQueries({ queryKey: ['proxies'] });
          toast.success(`Check completed: ${progress.active} active, ${progress.dead} dead`);
        }
      } catch (error) {
        console.error('Failed to fetch progress:', error);
      }
    };

    // Initial fetch
    pollProgress();

    // Poll every 2 seconds
    const interval = setInterval(pollProgress, 2000);

    return () => clearInterval(interval);
  }, [isPolling, queryClient]);

  const handleEdit = (proxy: Proxy) => {
    setSelectedProxy(proxy);
    setEditDialogOpen(true);
  };

  const handleDelete = (proxy: Proxy) => {
    setSelectedProxy(proxy);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedProxy) {
      deleteMutation.mutate(selectedProxy.id);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectAllPages) {
      const allIds = await getAllProxyIds();
      bulkDeleteMutation.mutate(allIds);
    } else {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
      // Reset selectAllPages when user unchecks an item
      if (selectAllPages) {
        setSelectAllPages(false);
      }
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Current data based on view mode
  const currentData = isTrashView ? trashData : data;
  const currentLoading = isTrashView ? isTrashLoading : isLoading;
  const currentFetching = isTrashView ? isTrashFetching : isFetching;

  const toggleSelectAll = () => {
    if (currentData?.proxies && selectedIds.size === currentData.proxies.length) {
      setSelectedIds(new Set());
      setSelectAllPages(false);
    } else if (currentData?.proxies) {
      setSelectedIds(new Set(currentData.proxies.map((p) => p.id)));
    }
  };

  // Check if all items on current page are selected
  const isCurrentPageAllSelected = currentData?.proxies &&
    currentData.proxies.length > 0 &&
    selectedIds.size === currentData.proxies.length &&
    !selectAllPages;

  // Handle select all pages
  const handleSelectAllPages = () => {
    setSelectAllPages(true);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectAllPages(false);
  };

  // Get all proxy IDs (for selectAllPages operations)
  const getAllProxyIds = async (): Promise<string[]> => {
    // Fetch all proxy IDs matching current filter
    const allIds: string[] = [];
    const fetchQuery = { ...query, limit: 100 };
    let currentPageNum = 1;
    let hasMore = true;

    const fetchFn = isTrashView ? proxyApi.getTrash : proxyApi.getAll;

    while (hasMore) {
      const response = await fetchFn({
        ...fetchQuery,
        page: currentPageNum,
      });
      allIds.push(...response.proxies.map((p) => p.id));
      hasMore = currentPageNum < response.meta.totalPages;
      currentPageNum++;
    }

    return allIds;
  };

  const totalPages = currentData?.meta.totalPages || 1;
  const total = currentData?.meta.total || 0;

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Export to Excel
  const handleExport = async (exportAll: boolean = false) => {
    setIsExporting(true);

    try {
      let proxiesToExport: Proxy[] = [];

      if (selectedIds.size > 0 && !exportAll) {
        // Export selected proxies
        proxiesToExport = data?.proxies.filter((p) => selectedIds.has(p.id)) || [];
      } else {
        // Export all proxies matching current filter
        // Fetch all pages with limit 100 (max allowed by backend)
        const exportQuery = { ...query, limit: 100 };
        let currentPage = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await proxyApi.getAll({
            ...exportQuery,
            page: currentPage,
          });
          proxiesToExport = [...proxiesToExport, ...response.proxies];
          hasMore = currentPage < response.meta.totalPages;
          currentPage++;
        }
      }

      if (proxiesToExport.length === 0) {
        toast.error('No proxies to export');
        return;
      }

      // Dynamic import xlsx
      const XLSX = await import('xlsx');

      // Create data array with headers
      const exportData = [
        ['Proxy', 'Services', 'Status'],
        ...proxiesToExport.map((proxy) => [
          formatProxyString(proxy),
          proxy.services.length > 0 ? proxy.services.map((s) => SERVICE_LABELS[s]).join(', ') : '',
          STATUS_LABELS[proxy.status],
        ]),
      ];

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(exportData);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 50 }, // Proxy
        { wch: 30 }, // Services
        { wch: 15 }, // Status
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Proxies');

      // Generate and download
      const date = new Date().toISOString().split('T')[0];
      const filename = `proxies_export_${date}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast.success(`Exported ${proxiesToExport.length} proxies successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to export proxies: ${errorMessage}`);
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isTrashView ? 'Trash' : 'Proxies'}
          </h1>
          <p className="text-muted-foreground">
            {isTrashView ? 'Deleted proxies - restore or permanently delete' : 'Manage proxy list'}
          </p>
        </div>
        <div className="flex gap-2">
          {isTrashView ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsTrashView(false);
                  setSelectedIds(new Set());
                  setSelectAllPages(false);
                  setPage(1);
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Back to Proxies
              </Button>
              {total > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setEmptyTrashDialogOpen(true)}
                  disabled={emptyTrashMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Empty Trash ({total})
                </Button>
              )}
            </>
          ) : (
            <>
              {isPolling ? (
                <Button
                  variant="destructive"
                  onClick={() => stopCheckMutation.mutate()}
                  disabled={stopCheckMutation.isPending}
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop Check
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setCheckConfirmOpen(true)}
                  disabled={checkAllMutation.isPending || checkSelectedMutation.isPending}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {selectedIds.size > 0 || selectAllPages
                    ? `Check Selected (${selectAllPages ? total : selectedIds.size})`
                    : 'Check All'}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setIsTrashView(true);
                  setSelectedIds(new Set());
                  setSelectAllPages(false);
                  setPage(1);
                }}
              >
                <Archive className="mr-2 h-4 w-4" />
                Trash
              </Button>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Proxies
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {checkProgress && checkProgress.isRunning && (
        <div className="mb-4 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">
                Checking proxies: {checkProgress.checked} / {checkProgress.total}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600">Active: {checkProgress.active}</span>
              <span className="text-red-600">Dead: {checkProgress.dead}</span>
            </div>
          </div>
          <Progress
            value={(checkProgress.checked / checkProgress.total) * 100}
            className="h-2"
          />
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by IP..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Export button - only in normal view */}
        {!isTrashView && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportConfirmOpen(true)}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {selectAllPages ? `Export All (${total})` : selectedIds.size > 0 ? `Export (${selectedIds.size})` : `Export All (${total})`}
          </Button>
        )}

        {/* Selection actions */}
        {(selectedIds.size > 0 || selectAllPages) && (
          isTrashView ? (
            // Trash view actions: Restore and Permanent Delete
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (selectAllPages) {
                    const allIds = await getAllProxyIds();
                    bulkRestoreMutation.mutate(allIds);
                  } else {
                    bulkRestoreMutation.mutate(Array.from(selectedIds));
                  }
                }}
                disabled={bulkRestoreMutation.isPending}
              >
                {bulkRestoreMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Restore ({selectAllPages ? total : selectedIds.size})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkPermanentDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Permanent Delete ({selectAllPages ? total : selectedIds.size})
              </Button>
            </>
          ) : (
            // Normal view action: Soft Delete
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectAllPages ? total : selectedIds.size})
            </Button>
          )
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
          <PopoverContent className="w-72" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-1 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>

              {/* Status filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as ProxyStatus | 'ALL');
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value={ProxyStatus.ACTIVE}>Active</SelectItem>
                    <SelectItem value={ProxyStatus.DEAD}>Dead</SelectItem>
                    <SelectItem value={ProxyStatus.CHECKING}>Checking</SelectItem>
                    <SelectItem value={ProxyStatus.UNKNOWN}>Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    setTypeFilter(value as ProxyType | 'ALL');
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value={ProxyType.IPV4_STATIC}>IPv4 Static</SelectItem>
                    <SelectItem value={ProxyType.IPV6_STATIC}>IPv6 Static</SelectItem>
                    <SelectItem value={ProxyType.SOCKS5}>SOCKS5</SelectItem>
                    <SelectItem value={ProxyType.ROTATING}>Rotating</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Service filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Service</Label>
                <Select
                  value={serviceFilter}
                  onValueChange={(value) => {
                    setServiceFilter(value as ProxyServiceType | 'ALL');
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Services</SelectItem>
                    <SelectItem value={ProxyServiceType.ENTITY}>Entity</SelectItem>
                    <SelectItem value={ProxyServiceType.BLOG_2_0}>Blog 2.0</SelectItem>
                    <SelectItem value={ProxyServiceType.PODCAST}>Podcast</SelectItem>
                    <SelectItem value={ProxyServiceType.SOCIAL}>Social</SelectItem>
                    <SelectItem value={ProxyServiceType.GG_STACKING}>GG Stacking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Sort by</Label>
                <div className="flex gap-2">
                  <Select
                    value={sortBy}
                    onValueChange={(value) => {
                      setSortBy(value as typeof sortBy);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Created Date</SelectItem>
                      <SelectItem value="ip">IP Address</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                      <SelectItem value="responseTime">Response Time</SelectItem>
                      <SelectItem value="lastCheckedAt">Last Checked</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={sortOrder}
                    onValueChange={(value) => {
                      setSortOrder(value as 'asc' | 'desc');
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Asc</SelectItem>
                      <SelectItem value="desc">Desc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          onClick={() => queryClient.invalidateQueries({ queryKey: isTrashView ? ['proxies-trash'] : ['proxies'] })}
          disabled={currentFetching}
        >
          <RefreshCw className={`h-4 w-4 ${currentFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="rounded-md border overflow-auto max-h-[calc(100vh-320px)] scrollbar-thin bg-background">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={
                    selectAllPages ||
                    (currentData?.proxies &&
                    currentData.proxies.length > 0 &&
                    selectedIds.size === currentData.proxies.length)
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                  className={
                    !selectAllPages &&
                    currentData?.proxies &&
                    currentData.proxies.length > 0 &&
                    selectedIds.size > 0 &&
                    selectedIds.size < currentData.proxies.length
                      ? 'opacity-50'
                      : ''
                  }
                />
              </TableHead>
              <TableHead className="w-[260px]">Proxy</TableHead>
              <TableHead className="w-[110px] text-center">
                <button
                  className="flex items-center justify-center gap-1 hover:text-foreground w-full"
                  onClick={() => {
                    if (sortBy === 'type') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('type');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Type
                  {sortBy === 'type' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </button>
              </TableHead>
              <TableHead className="w-[150px] text-center">Services</TableHead>
              <TableHead className="w-[100px] text-center">
                <button
                  className="flex items-center justify-center gap-1 hover:text-foreground w-full"
                  onClick={() => {
                    if (sortBy === 'status') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('status');
                      setSortOrder('desc');
                    }
                  }}
                >
                  Status
                  {sortBy === 'status' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </button>
              </TableHead>
              <TableHead className="w-[70px] text-center">Country</TableHead>
              <TableHead className="w-[130px] text-center">
                <button
                  className="flex items-center justify-center gap-1 hover:text-foreground w-full"
                  onClick={() => {
                    if (sortBy === 'lastCheckedAt') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('lastCheckedAt');
                      setSortOrder('desc');
                    }
                  }}
                >
                  Last Checked
                  {sortBy === 'lastCheckedAt' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </button>
              </TableHead>
              <TableHead className="w-[100px] text-center">
                <button
                  className="flex items-center justify-center gap-1 hover:text-foreground w-full"
                  onClick={() => {
                    if (sortBy === 'responseTime') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('responseTime');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Response
                  {sortBy === 'responseTime' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </button>
              </TableHead>
              <TableHead className="w-[80px] text-center">Fails</TableHead>
              <TableHead className="w-[110px] text-center">
                <button
                  className="flex items-center justify-center gap-1 hover:text-foreground w-full"
                  onClick={() => {
                    if (sortBy === 'createdAt') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('createdAt');
                      setSortOrder('desc');
                    }
                  }}
                >
                  Created
                  {sortBy === 'createdAt' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </button>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Select All Pages Banner - inside table for better UX */}
            {(isCurrentPageAllSelected || selectAllPages) && total > limit && (
              <TableRow className="bg-blue-50 hover:bg-blue-50">
                <TableCell colSpan={11} className="py-2 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    {selectAllPages ? (
                      <>
                        <span className="text-blue-800">
                          All <strong>{total}</strong> proxies are selected.
                        </span>
                        <button
                          className="text-blue-600 hover:text-blue-800 underline font-medium"
                          onClick={clearSelection}
                        >
                          Clear selection
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-blue-800">
                          All <strong>{currentData?.proxies.length}</strong> proxies on this page are selected.
                        </span>
                        <button
                          className="text-blue-600 hover:text-blue-800 underline font-medium"
                          onClick={handleSelectAllPages}
                        >
                          Select all {total} proxies
                        </button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
            {currentLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 11 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : currentData?.proxies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  {isTrashView ? 'No deleted proxies' : 'No proxies found'}
                </TableCell>
              </TableRow>
            ) : (
              currentData?.proxies.map((proxy) => (
                <TableRow key={proxy.id} className={selectAllPages || selectedIds.has(proxy.id) ? 'bg-blue-50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectAllPages || selectedIds.has(proxy.id)}
                      onCheckedChange={() => toggleSelect(proxy.id)}
                    />
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <span className="font-mono text-sm truncate block">{formatProxyString(proxy)}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className={TYPE_BADGE_CLASSES[proxy.type]}>
                      {TYPE_LABELS[proxy.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {proxy.services.length > 0 ? (
                        proxy.services.map((service) => (
                          <Badge
                            key={service}
                            variant="secondary"
                            className={`text-xs ${SERVICE_BADGE_CLASSES[service]}`}
                          >
                            {SERVICE_LABELS[service]}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className={STATUS_BADGE_CLASSES[proxy.status]}>
                      {STATUS_LABELS[proxy.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {proxy.country ? (
                      <span className="text-sm font-medium">{proxy.country}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {proxy.lastCheckedAt ? (
                      new Date(proxy.lastCheckedAt).toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {proxy.responseTime ? (
                      <span className={`text-sm ${proxy.responseTime < 500 ? 'text-green-600' : proxy.responseTime < 1000 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {proxy.responseTime}ms
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-sm ${proxy.failCount > 0 ? 'text-red-600 font-medium' : ''}`}>
                      {proxy.failCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {new Date(proxy.createdAt).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isTrashView ? (
                          // Trash view actions
                          <>
                            <DropdownMenuItem
                              onClick={() => restoreMutation.mutate(proxy.id)}
                              disabled={restoreMutation.isPending}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Restore
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedProxy(proxy);
                                setPermanentDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Permanent Delete
                            </DropdownMenuItem>
                          </>
                        ) : (
                          // Normal view actions
                          <>
                            <DropdownMenuItem
                              onClick={() => checkProxyMutation.mutate(proxy.id)}
                              disabled={checkProxyMutation.isPending}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Check Proxy
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(proxy)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(proxy)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing</span>
          <Select
            value={String(limit)}
            onValueChange={(value) => {
              setLimit(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[70px] bg-background">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>of {total} proxies</span>
        </div>

        <div className="flex items-center gap-1 bg-background">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(1)}
            disabled={page === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
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
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <AddProxyDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <EditProxyDialog
        proxy={selectedProxy}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* Delete single proxy dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete proxy?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the proxy <strong>{selectedProxy?.ip}:{selectedProxy?.port}</strong> to trash. You can restore it later from the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectAllPages ? total : selectedIds.size} proxies?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move {selectAllPages ? 'all' : 'the selected'} proxies to trash. You can restore them later from the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectAllPages ? total : selectedIds.size} proxies`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export confirm dialog */}
      <AlertDialog open={exportConfirmOpen} onOpenChange={setExportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export Proxies</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.size > 0
                ? `Are you sure you want to export ${selectedIds.size} selected proxies to Excel?`
                : `Are you sure you want to export all ${total} proxies to Excel?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setExportConfirmOpen(false);
                handleExport(selectedIds.size === 0);
              }}
            >
              Export
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Check confirm dialog */}
      <AlertDialog open={checkConfirmOpen} onOpenChange={setCheckConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Check Proxies</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.size > 0 || selectAllPages
                ? `Are you sure you want to check ${selectAllPages ? total : selectedIds.size} selected proxies?`
                : `Are you sure you want to check all proxies?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setCheckConfirmOpen(false);
                if (selectAllPages) {
                  const allIds = await getAllProxyIds();
                  checkSelectedMutation.mutate(allIds);
                } else if (selectedIds.size > 0) {
                  checkSelectedMutation.mutate(Array.from(selectedIds));
                } else {
                  checkAllMutation.mutate();
                }
              }}
            >
              Check
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Empty trash dialog */}
      <AlertDialog open={emptyTrashDialogOpen} onOpenChange={setEmptyTrashDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {total} proxies in trash. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setEmptyTrashDialogOpen(false);
                emptyTrashMutation.mutate();
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={emptyTrashMutation.isPending}
            >
              {emptyTrashMutation.isPending ? 'Deleting...' : 'Empty Trash'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent delete single proxy dialog */}
      <AlertDialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the proxy <strong>{selectedProxy?.ip}:{selectedProxy?.port}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedProxy) {
                  permanentDeleteMutation.mutate(selectedProxy.id);
                }
                setPermanentDeleteDialogOpen(false);
                setSelectedProxy(null);
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={permanentDeleteMutation.isPending}
            >
              {permanentDeleteMutation.isPending ? 'Deleting...' : 'Permanently Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk permanent delete dialog */}
      <AlertDialog open={bulkPermanentDeleteDialogOpen} onOpenChange={setBulkPermanentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete {selectAllPages ? total : selectedIds.size} proxies?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectAllPages ? 'all' : 'the selected'} proxies. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setBulkPermanentDeleteDialogOpen(false);
                if (selectAllPages) {
                  const allIds = await getAllProxyIds();
                  bulkPermanentDeleteMutation.mutate(allIds);
                } else {
                  bulkPermanentDeleteMutation.mutate(Array.from(selectedIds));
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={bulkPermanentDeleteMutation.isPending}
            >
              {bulkPermanentDeleteMutation.isPending ? 'Deleting...' : `Permanently Delete ${selectAllPages ? total : selectedIds.size} proxies`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ProxiesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Skeleton className="h-9 w-32 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="rounded-md border">
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      }
    >
      <ProxiesPageContent />
    </Suspense>
  );
}
