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
  ProxyProtocol,
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

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (data?.proxies && selectedIds.size === data.proxies.length) {
      setSelectedIds(new Set());
    } else if (data?.proxies) {
      setSelectedIds(new Set(data.proxies.map((p) => p.id)));
    }
  };

  const totalPages = data?.meta.totalPages || 1;
  const total = data?.meta.total || 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proxies</h1>
          <p className="text-muted-foreground">Manage proxy list</p>
        </div>
        <div className="flex gap-2">
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
              onClick={() => {
                if (selectedIds.size > 0) {
                  checkSelectedMutation.mutate(Array.from(selectedIds));
                } else {
                  checkAllMutation.mutate();
                }
              }}
              disabled={checkAllMutation.isPending || checkSelectedMutation.isPending}
            >
              <Zap className="mr-2 h-4 w-4" />
              {selectedIds.size > 0 ? `Check Selected (${selectedIds.size})` : 'Check All'}
            </Button>
          )}
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Proxies
          </Button>
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

        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete ({selectedIds.size})
          </Button>
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
          onClick={() => queryClient.invalidateQueries({ queryKey: ['proxies'] })}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="rounded-md border overflow-auto max-h-[calc(100vh-320px)] scrollbar-thin bg-background">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={data?.proxies && data.proxies.length > 0 && selectedIds.size === data.proxies.length}
                  onCheckedChange={toggleSelectAll}
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
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 11 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.proxies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  No proxies found
                </TableCell>
              </TableRow>
            ) : (
              data?.proxies.map((proxy) => (
                <TableRow key={proxy.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(proxy.id)}
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the proxy <strong>{selectedProxy?.ip}:{selectedProxy?.port}</strong>. This action cannot
              be undone.
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
            <AlertDialogTitle>Delete {selectedIds.size} proxies?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected proxies. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedIds.size} proxies`}
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
