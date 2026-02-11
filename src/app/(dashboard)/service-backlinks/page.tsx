'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search,
  MoreHorizontal,
  Trash2,
  Eye,
  Copy,
  Check,
  Pencil,
  Plus,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { serviceRequestApi } from '@/lib/api';
import { CreateRequestDialog } from '@/components/service-requests/create-request-dialog';
import { useAuthStore } from '@/stores';
import {
  ServiceRequest,
  ServiceType,
  RequestStatus,
  Role,
} from '@/types';

const statusColors: Record<RequestStatus, string> = {
  [RequestStatus.DRAFT]: 'bg-gray-100 text-gray-800',
  [RequestStatus.NEW]: 'bg-blue-100 text-blue-800',
  [RequestStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [RequestStatus.RUNNING]: 'bg-cyan-100 text-cyan-800',
  [RequestStatus.CONNECTING]: 'bg-purple-100 text-purple-800',
  [RequestStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [RequestStatus.CANCEL]: 'bg-red-100 text-red-800',
};

const serviceTypeLabels: Record<ServiceType, string> = {
  [ServiceType.ENTITY]: 'Entity',
  [ServiceType.BLOG2]: 'Blog 2.0',
  [ServiceType.PODCAST]: 'Podcast',
  [ServiceType.SOCIAL]: 'Social',
  [ServiceType.GG_STACKING]: 'GG Stacking',
};

const serviceTypeColors: Record<ServiceType, string> = {
  [ServiceType.ENTITY]: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  [ServiceType.BLOG2]: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  [ServiceType.PODCAST]: 'bg-pink-100 text-pink-800 hover:bg-pink-200',
  [ServiceType.SOCIAL]: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200',
  [ServiceType.GG_STACKING]: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
};

function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const shortId = id.slice(-4);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="font-mono text-xs text-muted-foreground hover:text-foreground cursor-pointer">
          {shortId}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs select-all">{id}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function getWebsiteFromConfig(config?: Record<string, unknown> | null): string {
  if (!config) return '-';
  return (config.website as string) || '-';
}

function getTargetFromRequest(req: ServiceRequest): number {
  // Priority: target field > config.entityLimit > config.target > totalLinks
  if (req.target) {
    const parsed = parseInt(req.target, 10);
    if (!isNaN(parsed)) return parsed;
  }
  if (req.config) {
    const entityLimit = req.config.entityLimit as number | undefined;
    if (entityLimit && typeof entityLimit === 'number') return entityLimit;
    const configTarget = req.config.target as number | string | undefined;
    if (configTarget) {
      const parsed = typeof configTarget === 'number' ? configTarget : parseInt(configTarget, 10);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return req.totalLinks;
}

const COLUMN_COUNT = 11;

export default function ServiceBacklinksPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuthStore();
  const canQuickUpdate = hasRole([Role.ADMIN, Role.DEV]);

  const [search, setSearch] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [quickUpdateDialogOpen, setQuickUpdateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  // Quick update form
  const [quickUpdateForm, setQuickUpdateForm] = useState({
    idTool: '',
    runCount: 0,
    target: '',
    status: '' as RequestStatus | '',
  });

  // Fetch service requests
  const { data, isLoading, error } = useQuery({
    queryKey: ['service-requests', page, limit, search, serviceTypeFilter, statusFilter],
    queryFn: () =>
      serviceRequestApi.getAll({
        page,
        limit,
        search: search || undefined,
        serviceType: serviceTypeFilter !== 'all' ? serviceTypeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
  });

  // Mutations
  const quickUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { idTool?: string | null; runCount?: number; target?: string | null; status?: string } }) =>
      serviceRequestApi.quickUpdate(id, data),
    onSuccess: () => {
      toast.success('Request updated');
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      setQuickUpdateDialogOpen(false);
      setSelectedRequest(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update request');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: serviceRequestApi.delete,
    onSuccess: () => {
      toast.success('Request deleted');
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      setDeleteDialogOpen(false);
      setSelectedRequest(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete request');
    },
  });

  const handleViewDetail = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleQuickUpdate = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setQuickUpdateForm({
      idTool: request.idTool || '',
      runCount: request.runCount,
      target: request.target || '',
      status: request.status,
    });
    setQuickUpdateDialogOpen(true);
  };

  const handleQuickUpdateSubmit = () => {
    if (!selectedRequest) return;
    const data: { idTool?: string | null; runCount?: number; target?: string | null; status?: string } = {};
    if (quickUpdateForm.idTool !== (selectedRequest.idTool || '')) {
      data.idTool = quickUpdateForm.idTool || null;
    }
    if (quickUpdateForm.runCount !== selectedRequest.runCount) {
      data.runCount = quickUpdateForm.runCount;
    }
    if (quickUpdateForm.target !== (selectedRequest.target || '')) {
      data.target = quickUpdateForm.target || null;
    }
    if (quickUpdateForm.status && quickUpdateForm.status !== selectedRequest.status) {
      data.status = quickUpdateForm.status;
    }
    if (Object.keys(data).length === 0) {
      toast.info('No changes to update');
      return;
    }
    quickUpdateMutation.mutate({ id: selectedRequest.id, data });
  };

  const handleDelete = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setDeleteDialogOpen(true);
  };

  const totalPages = data?.pagination.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Backlinks</h1>
          <p className="text-muted-foreground">
            Manage service requests from all services (Entity, Blog2, Social, Podcast, GG Stacking)
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Request
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md bg-background">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, website, ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={serviceTypeFilter}
          onValueChange={(value) => {
            setServiceTypeFilter(value as ServiceType | 'all');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue placeholder="All Services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {Object.values(ServiceType).map((type) => (
              <SelectItem key={type} value={type}>
                {serviceTypeLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as RequestStatus | 'all');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.values(RequestStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">ID</TableHead>
              <TableHead className="text-center">Website</TableHead>
              <TableHead className="text-center">Service</TableHead>
              <TableHead className="text-center">Name</TableHead>
              <TableHead className="text-center">Time</TableHead>
              <TableHead className="text-center">Checked At</TableHead>
              <TableHead className="text-center">Total Account</TableHead>
              <TableHead className="text-center">Result</TableHead>
              <TableHead className="text-center">Id Tool</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: COLUMN_COUNT }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-16 mx-auto" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && error && (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="text-center text-muted-foreground py-8">
                  Failed to load service requests. Please try again.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !error && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="text-center text-muted-foreground py-8">
                  No service requests found.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              !error &&
              data?.data.map((req: ServiceRequest) => (
                <TableRow key={req.id}>
                  {/* ID - 4 ký tự cuối, click để xem full + copy */}
                  <TableCell className="text-center">
                    <CopyableId id={req.id} />
                  </TableCell>

                  {/* Website - lấy từ config */}
                  <TableCell className="text-center text-sm max-w-[200px] truncate">
                    {getWebsiteFromConfig(req.config)}
                  </TableCell>

                  {/* Service */}
                  <TableCell className="text-center">
                    <Badge variant="secondary" className={serviceTypeColors[req.serviceType]}>
                      {serviceTypeLabels[req.serviceType]}
                    </Badge>
                  </TableCell>

                  {/* Name */}
                  <TableCell className="text-center text-sm font-medium max-w-[150px] truncate">
                    {req.name || '-'}
                  </TableCell>

                  {/* Time - createdAt */}
                  <TableCell className="text-center text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(req.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </TableCell>

                  {/* Checked At */}
                  <TableCell className="text-center text-sm text-muted-foreground whitespace-nowrap">
                    {req.checkedAt
                      ? new Date(req.checkedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : '-'}
                  </TableCell>

                  {/* Total Account - phát triển sau cho Blog2/Podcast */}
                  <TableCell className="text-center text-sm text-muted-foreground">
                    -
                  </TableCell>

                  {/* Result */}
                  <TableCell className="text-center">
                    {(() => {
                      const target = getTargetFromRequest(req);
                      const completed = req.completedLinks + req.failedLinks;
                      const progress = target > 0 ? Math.min(100, (completed / target) * 100) : 0;
                      return (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            <span className="text-green-600">{req.completedLinks}</span>
                            {req.failedLinks > 0 && (
                              <span className="text-red-600">/{req.failedLinks}</span>
                            )}
                            <span>/{target}</span>
                          </span>
                        </div>
                      );
                    })()}
                  </TableCell>

                  {/* Id Tool */}
                  <TableCell className="text-center text-sm font-mono text-muted-foreground">
                    {req.idTool || '-'}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    <Badge variant="secondary" className={statusColors[req.status]}>
                      {req.status}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetail(req)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {canQuickUpdate && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleQuickUpdate(req)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Quick Update
                            </DropdownMenuItem>
                          </>
                        )}
                        {['DRAFT', 'NEW', 'CANCEL', 'COMPLETED'].includes(req.status) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(req)}
                              className="text-red-600"
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
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to{' '}
            {Math.min(page * limit, data.pagination.total)} of {data.pagination.total} requests
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm select-all">{selectedRequest.id}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">External ID</p>
                  <p className="font-mono text-sm">{selectedRequest.externalId || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service Type</p>
                  <Badge variant="secondary" className={serviceTypeColors[selectedRequest.serviceType]}>
                    {serviceTypeLabels[selectedRequest.serviceType]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="secondary" className={statusColors[selectedRequest.status]}>
                    {selectedRequest.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="text-sm">{selectedRequest.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Website</p>
                  <p className="text-sm">{getWebsiteFromConfig(selectedRequest.config)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Domains</p>
                  <p className="text-sm">{selectedRequest.domains}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tool</p>
                  <p className="font-mono text-sm">{selectedRequest.idTool || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="text-sm">{selectedRequest.auctionPrice ?? '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">KH User</p>
                  <p className="text-sm">
                    {selectedRequest.externalUserName || '-'}
                    {selectedRequest.externalUserEmail && (
                      <span className="text-muted-foreground"> ({selectedRequest.externalUserEmail})</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assigned To</p>
                  <p className="text-sm">{selectedRequest.assignedUser?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Run Count</p>
                  <p className="text-sm">{selectedRequest.runCount}</p>
                </div>
              </div>

              {/* Result */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Result</p>
                {(() => {
                  const target = getTargetFromRequest(selectedRequest);
                  const completed = selectedRequest.completedLinks + selectedRequest.failedLinks;
                  const progress = target > 0 ? Math.min(100, (completed / target) * 100) : 0;
                  return (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {progress.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Target: {target}</span>
                        <span>Allocated: {selectedRequest.totalLinks}</span>
                        <span className="text-green-600">Completed: {selectedRequest.completedLinks}</span>
                        <span className="text-red-600">Failed: {selectedRequest.failedLinks}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Config */}
              {selectedRequest.config && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Config</p>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedRequest.config, null, 2)}
                  </pre>
                </div>
              )}

              {/* Batches */}
              {selectedRequest.batches && selectedRequest.batches.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Allocation Batches</p>
                  <div className="space-y-2">
                    {selectedRequest.batches.map((batch) => (
                      <div key={batch.id} className="flex items-center justify-between bg-muted p-2 rounded-md text-sm">
                        <span>Batch #{batch.batchNumber}</span>
                        <span>{batch.allocatedCount}/{batch.targetCount} allocated</span>
                        <Badge variant="secondary" className="text-xs">{batch.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Checked At</p>
                  <p>{selectedRequest.checkedAt ? new Date(selectedRequest.checkedAt).toLocaleString() : '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p>{new Date(selectedRequest.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Update Dialog */}
      <Dialog open={quickUpdateDialogOpen} onOpenChange={setQuickUpdateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Update</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qu-idTool">Id Tool</Label>
                <Input
                  id="qu-idTool"
                  value={quickUpdateForm.idTool}
                  onChange={(e) =>
                    setQuickUpdateForm((prev) => ({ ...prev, idTool: e.target.value }))
                  }
                  placeholder="Enter tool ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qu-runCount">Run Count</Label>
                <Input
                  id="qu-runCount"
                  type="number"
                  min={0}
                  value={quickUpdateForm.runCount}
                  onChange={(e) =>
                    setQuickUpdateForm((prev) => ({ ...prev, runCount: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qu-target">Target</Label>
                <Input
                  id="qu-target"
                  value={quickUpdateForm.target}
                  onChange={(e) =>
                    setQuickUpdateForm((prev) => ({ ...prev, target: e.target.value }))
                  }
                  placeholder="Enter target"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qu-status">Status</Label>
                <Select
                  value={quickUpdateForm.status}
                  onValueChange={(value) =>
                    setQuickUpdateForm((prev) => ({ ...prev, status: value as RequestStatus }))
                  }
                >
                  <SelectTrigger id="qu-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(RequestStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuickUpdateSubmit} disabled={quickUpdateMutation.isPending}>
              {quickUpdateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Request Dialog */}
      <CreateRequestDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the service request{' '}
              <span className="font-semibold">{selectedRequest?.name || selectedRequest?.id.slice(-4)}</span>.
              This action can be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRequest && deleteMutation.mutate(selectedRequest.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
