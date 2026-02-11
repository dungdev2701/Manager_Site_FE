'use client';

import { useState, Suspense } from 'react';
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
  X,
  Filter,
  Download,
  UserCheck,
  MailCheck,
  Loader2,
  Key,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { gmailApi } from '@/lib/api';
import { Gmail, GmailStatus, GmailQuery } from '@/types';
import { useDebounce } from '@/hooks';
import { AddEmailDialog } from '@/components/emails/add-email-dialog';
import { EditEmailDialog } from '@/components/emails/edit-email-dialog';
import { TwoFADialog } from '@/components/emails/twofa-dialog';

const STATUS_BADGE_CLASSES = {
  SUCCESS: 'bg-green-100 text-green-800 border-green-200',
  FAILED: 'bg-red-100 text-red-800 border-red-200',
};

function EmailsPageContent() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<GmailStatus | 'ALL'>('ALL');
  const [ownerFilter, setOwnerFilter] = useState<string>('ALL'); // 'ALL', 'none', or user ID
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'email' | 'createdAt' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [twoFADialogOpen, setTwoFADialogOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Gmail | null>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllPages, setSelectAllPages] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Export warning dialog
  const [exportWarningOpen, setExportWarningOpen] = useState(false);
  const [alreadyUsedEmails, setAlreadyUsedEmails] = useState<Array<{
    email: string;
    usageCount: number;
    users: Array<{ id: string; name: string; usedAt: string }>;
  }>>([]);
  const [pendingExportEmails, setPendingExportEmails] = useState<Gmail[]>([]);

  // Check email state
  const [checkingEmailId, setCheckingEmailId] = useState<string | null>(null);
  const [bulkCheckingEmails, setBulkCheckingEmails] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const query: GmailQuery = {
    page,
    limit,
    search: debouncedSearch || undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    ownerId: ownerFilter !== 'ALL' ? ownerFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sortBy,
    sortOrder,
  };

  // Count active filters
  const activeFilterCount = [
    statusFilter !== 'ALL',
    ownerFilter !== 'ALL',
    startDate !== '',
    endDate !== '',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter('ALL');
    setOwnerFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['gmails', query],
    queryFn: () => gmailApi.getAll(query),
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: false, // Only when tab is focused
  });

  const deleteMutation = useMutation({
    mutationFn: gmailApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmails'] });
      toast.success('Email deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedEmail(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete email');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => gmailApi.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmails'] });
      toast.success(`${selectedIds.size} emails deleted successfully`);
      setBulkDeleteDialogOpen(false);
      setSelectedIds(new Set());
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete emails');
    },
  });

  const claimMutation = useMutation({
    mutationFn: (id: string) => gmailApi.claimOwnership([id]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmails'] });
      toast.success('Đã claim email thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể claim email');
    },
  });

  // Pagination values - defined early for use in selection handlers
  const totalPages = data?.meta.totalPages || 1;
  const total = data?.meta.total || 0;

  // Selection handlers
  const currentPageIds = data?.gmails.map((g) => g.id) || [];
  const allPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.has(id));
  const someSelected = currentPageIds.some((id) => selectedIds.has(id));

  // Check if we should show the "Select All Pages" banner
  const isCurrentPageAllSelected = allPageSelected && !selectAllPages;
  const showSelectAllBanner = (isCurrentPageAllSelected || selectAllPages) && total > limit;

  const handleSelectAllPage = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set([...selectedIds, ...currentPageIds]));
    } else {
      // If selectAllPages was on, turn it off
      if (selectAllPages) {
        setSelectAllPages(false);
      }
      const newSet = new Set(selectedIds);
      currentPageIds.forEach((id) => newSet.delete(id));
      setSelectedIds(newSet);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    // If we're in selectAllPages mode and unchecking, exit that mode
    if (selectAllPages && !checked) {
      setSelectAllPages(false);
    }
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectAllPages(false);
  };

  // Get all email IDs for selectAllPages operations
  const getAllEmailIds = async (): Promise<string[]> => {
    const allIds: string[] = [];
    const fetchQuery = { ...query, limit: 100 };
    let currentPageNum = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await gmailApi.getAll({ ...fetchQuery, page: currentPageNum });
      allIds.push(...response.gmails.map((g) => g.id));
      hasMore = currentPageNum < response.meta.totalPages;
      currentPageNum++;
    }

    return allIds;
  };

  // Handle select all pages
  const handleSelectAllPages = async () => {
    setSelectAllPages(true);
    // Also select all IDs on current page for visual feedback
    setSelectedIds(new Set(currentPageIds));
  };

  const handleBulkDelete = async () => {
    let idsToDelete: string[];
    if (selectAllPages) {
      idsToDelete = await getAllEmailIds();
    } else {
      idsToDelete = Array.from(selectedIds);
    }
    bulkDeleteMutation.mutate(idsToDelete);
  };

  // Check single email
  const handleCheckEmail = async (email: Gmail) => {
    if (!email.appPassword) {
      toast.error('Email không có App Password');
      return;
    }

    setCheckingEmailId(email.id);
    try {
      const result = await gmailApi.checkEmail(email.id);
      queryClient.invalidateQueries({ queryKey: ['gmails'] });

      if (result.success) {
        toast.success(`${email.email}: Có thể nhận mail - SUCCESS`);
      } else {
        toast.error(`${email.email}: ${result.message || 'Không thể nhận mail'} - FAILED`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Lỗi khi kiểm tra';
      toast.error(`${email.email}: ${message}`);
    } finally {
      setCheckingEmailId(null);
    }
  };

  // Check multiple emails (max 10)
  const handleBulkCheckEmail = async () => {
    const selectedCount = selectAllPages ? total : selectedIds.size;

    if (selectedCount === 0) {
      toast.error('Vui lòng chọn email để kiểm tra');
      return;
    }

    if (selectedCount > 10) {
      toast.error('Chỉ được kiểm tra tối đa 10 email một lúc');
      return;
    }

    setBulkCheckingEmails(true);
    try {
      let idsToCheck: string[];
      if (selectAllPages) {
        idsToCheck = await getAllEmailIds();
      } else {
        idsToCheck = Array.from(selectedIds);
      }

      const result = await gmailApi.checkEmails(idsToCheck);
      queryClient.invalidateQueries({ queryKey: ['gmails'] });
      toast.success(`Kiểm tra xong: ${result.summary.success} SUCCESS, ${result.summary.failed} FAILED`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Lỗi khi kiểm tra';
      toast.error(message);
    } finally {
      setBulkCheckingEmails(false);
    }
  };

  const handleExport = async () => {
    const selectedCount = selectAllPages ? total : selectedIds.size;

    if (selectedCount === 0) {
      toast.error('Please select emails to export');
      return;
    }

    try {
      let idsToExport: string[];
      let emailsToExport: Gmail[];

      if (selectAllPages) {
        // Fetch all emails for export
        idsToExport = await getAllEmailIds();
        // Need to fetch all email data for export
        const allEmails: Gmail[] = [];
        const fetchQuery = { ...query, limit: 100 };
        let currentPageNum = 1;
        let hasMore = true;
        while (hasMore) {
          const response = await gmailApi.getAll({ ...fetchQuery, page: currentPageNum });
          allEmails.push(...response.gmails);
          hasMore = currentPageNum < response.meta.totalPages;
          currentPageNum++;
        }
        emailsToExport = allEmails;
      } else {
        idsToExport = Array.from(selectedIds);
        emailsToExport = data?.gmails.filter((email) => selectedIds.has(email.id)) || [];
      }

      // Check usage status first (does NOT create records)
      const result = await gmailApi.checkUsage(idsToExport);

      // If some emails are already used, show warning
      if (result.alreadyUsed.length > 0) {
        setAlreadyUsedEmails(result.alreadyUsed);
        setPendingExportEmails(emailsToExport);
        setExportWarningOpen(true);
        return;
      }

      // All emails are new, claim and export
      await gmailApi.claimOwnership(idsToExport);
      await performExport(emailsToExport);

      // Refresh the list to show updated owners
      queryClient.invalidateQueries({ queryKey: ['gmails'] });
    } catch (error) {
      toast.error('Failed to export emails');
    }
  };

  const performExport = async (emailsToExport: Gmail[]) => {
    // Dynamic import xlsx
    const XLSX = await import('xlsx');

    // Create data array with headers
    const exportData = [
      ['Email', 'Password', 'App Password', '2FA', 'Recovery Email'],
      ...emailsToExport.map((email) => [
        email.email,
        email.password,
        email.appPassword || '',
        email.twoFA || '',
        email.recoveryEmail || '',
      ]),
    ];

    // Create worksheet and workbook
    const worksheet = XLSX.utils.aoa_to_sheet(exportData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 35 }, // Email
      { wch: 20 }, // Password
      { wch: 20 }, // App Password
      { wch: 35 }, // 2FA
      { wch: 35 }, // Recovery Email
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Emails');

    // Generate and download
    const date = new Date().toISOString().split('T')[0];
    const filename = `emails_export_${date}.xlsx`;
    XLSX.writeFile(workbook, filename);

    toast.success(`Exported ${emailsToExport.length} emails successfully`);
    setSelectedIds(new Set());
  };

  const handleExportOnlyAvailable = async () => {
    // Filter out already used emails and export only available ones
    const availableEmails = pendingExportEmails.filter(
      (email) => !alreadyUsedEmails.some((used) => used.email === email.email)
    );

    if (availableEmails.length === 0) {
      toast.error('Không có email khả dụng để tải về');
      setExportWarningOpen(false);
      return;
    }

    try {
      // Claim ownership only for available emails
      await gmailApi.claimOwnership(availableEmails.map((e) => e.id));
      await performExport(availableEmails);
      queryClient.invalidateQueries({ queryKey: ['gmails'] });
    } catch (error) {
      toast.error('Failed to export emails');
    }
    setExportWarningOpen(false);
  };

  const handleExportAll = async () => {
    try {
      // Claim ownership for all selected emails
      await gmailApi.claimOwnership(pendingExportEmails.map((e) => e.id));
      await performExport(pendingExportEmails);
      queryClient.invalidateQueries({ queryKey: ['gmails'] });
    } catch (error) {
      toast.error('Failed to export emails');
    }
    setExportWarningOpen(false);
  };

  const handleEdit = (email: Gmail) => {
    setSelectedEmail(email);
    setEditDialogOpen(true);
  };

  const handleDelete = (email: Gmail) => {
    setSelectedEmail(email);
    setDeleteDialogOpen(true);
  };

  const handleGet2FA = (email: Gmail) => {
    if (!email.twoFA) {
      toast.error('Email này không có secret key 2FA');
      return;
    }
    setSelectedEmail(email);
    setTwoFADialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedEmail) {
      deleteMutation.mutate(selectedEmail.id);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emails</h1>
          <p className="text-muted-foreground">Manage Gmail accounts</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Email
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Filter Popover */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
                    Clear all
                  </Button>
                )}
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as GmailStatus | 'ALL');
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value={GmailStatus.SUCCESS}>Success</SelectItem>
                    <SelectItem value={GmailStatus.FAILED}>Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Owner Filter */}
              <div className="space-y-2">
                <Label>Owner</Label>
                <Select
                  value={ownerFilter}
                  onValueChange={(value) => {
                    setOwnerFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Owners" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Owners</SelectItem>
                    <SelectItem value="none">No Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label>Created Date</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setPage(1);
                      }}
                      placeholder="From"
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setPage(1);
                      }}
                      placeholder="To"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['gmails'] })}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>

        {/* Selection Actions - shown on the far right when items selected */}
        {(selectedIds.size > 0 || selectAllPages) && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200">
              {selectAllPages ? total : selectedIds.size} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkCheckEmail}
              disabled={bulkCheckingEmails || (selectAllPages ? total > 10 : selectedIds.size > 10)}
              className="h-8"
              title={(selectAllPages ? total > 10 : selectedIds.size > 10) ? 'Tối đa 10 email' : undefined}
            >
              {bulkCheckingEmails ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <MailCheck className="h-4 w-4 mr-1" />
              )}
              Check Mail {(selectAllPages ? total > 10 : selectedIds.size > 10) && `(max 10)`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-8"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteDialogOpen(true)}
              className="h-8"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border overflow-auto max-h-[calc(100vh-320px)] scrollbar-thin bg-background">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <TableRow>
              <TableHead className="w-[50px] text-center">
                <Checkbox
                  checked={selectAllPages || allPageSelected}
                  onCheckedChange={handleSelectAllPage}
                  aria-label="Select all"
                  className={someSelected && !allPageSelected && !selectAllPages ? 'opacity-50' : ''}
                />
              </TableHead>
              <TableHead className="w-[250px] text-center">Email</TableHead>
              <TableHead className="w-[150px] text-center">Password</TableHead>
              <TableHead className="w-[150px] text-center">App Password</TableHead>
              <TableHead className="w-[150px] text-center">2FA</TableHead>
              <TableHead className="w-[200px] text-center">Recovery Email</TableHead>
              <TableHead className="w-[120px] text-center">Owner</TableHead>
              <TableHead className="w-[100px] text-center">
                <button
                  className="flex items-center gap-1 hover:text-foreground mx-auto"
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
              <TableHead className="w-[80px] text-center">Check</TableHead>
              <TableHead className="w-[150px] text-center">
                <button
                  className="flex items-center gap-1 hover:text-foreground mx-auto"
                  onClick={() => {
                    if (sortBy === 'createdAt') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('createdAt');
                      setSortOrder('desc');
                    }
                  }}
                >
                  Created At
                  {sortBy === 'createdAt' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </button>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Select All Pages Banner - inside table for better UX */}
            {showSelectAllBanner && (
              <TableRow className="bg-blue-50 hover:bg-blue-50">
                <TableCell colSpan={11} className="py-2 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    {selectAllPages ? (
                      <>
                        <span className="text-blue-800">
                          All <strong>{total}</strong> emails are selected.
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
                          All <strong>{currentPageIds.length}</strong> emails on this page are selected.
                        </span>
                        <button
                          className="text-blue-600 hover:text-blue-800 underline font-medium"
                          onClick={handleSelectAllPages}
                        >
                          Select all {total} emails
                        </button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
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
            ) : data?.gmails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  No emails found
                </TableCell>
              </TableRow>
            ) : (
              data?.gmails.map((email) => (
                <TableRow key={email.id} className={selectAllPages || selectedIds.has(email.id) ? 'bg-blue-50' : ''}>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={selectAllPages || selectedIds.has(email.id)}
                      onCheckedChange={(checked) => handleSelectOne(email.id, !!checked)}
                      aria-label={`Select ${email.email}`}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">{email.email}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-sm">{email.password}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {email.appPassword ? (
                      <span className="font-mono text-sm">{email.appPassword}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {email.twoFA ? (
                      <span className="font-mono text-sm">{email.twoFA}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {email.recoveryEmail || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {email.usages && email.usages.length > 0 ? (
                      email.usages.length === 1 ? (
                        // 1 lần sử dụng: hiển thị tên người dùng
                        <span>{email.usages[0].user.name}</span>
                      ) : (
                        // > 1 lần sử dụng: hiển thị số lần với tooltip
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="cursor-pointer">
                                {email.usages.length} lần sử dụng
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium text-sm">Lịch sử sử dụng:</p>
                                <ul className="text-xs space-y-0.5">
                                  {email.usages.map((usage, idx) => (
                                    <li key={usage.id || idx}>
                                      {usage.user.name} - {new Date(usage.usedAt).toLocaleDateString('vi-VN')}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className={STATUS_BADGE_CLASSES[email.status]}>
                      {email.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCheckEmail(email)}
                      disabled={checkingEmailId === email.id || !email.appPassword}
                      className="h-8 px-2"
                      title={!email.appPassword ? 'Không có App Password' : 'Kiểm tra email'}
                    >
                      {checkingEmailId === email.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MailCheck className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {new Date(email.createdAt).toLocaleString('vi-VN')}
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
                          onClick={() => handleGet2FA(email)}
                          disabled={!email.twoFA}
                        >
                          <Key className="mr-2 h-4 w-4" />
                          Get 2FA
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => claimMutation.mutate(email.id)}
                          disabled={claimMutation.isPending}
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
                          Claim
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(email)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(email)}
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
            </SelectContent>
          </Select>
          <span>of {total} emails</span>
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
      <AddEmailDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <EditEmailDialog
        email={selectedEmail}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
      <TwoFADialog
        open={twoFADialogOpen}
        onOpenChange={setTwoFADialogOpen}
        email={selectedEmail?.email || ''}
        secret={selectedEmail?.twoFA || ''}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the email <strong>{selectedEmail?.email}</strong>. This action cannot
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

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectAllPages ? total : selectedIds.size} emails?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectAllPages ? total : selectedIds.size} selected email{(selectAllPages ? total : selectedIds.size) > 1 ? 's' : ''}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectAllPages ? total : selectedIds.size} emails`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Warning Dialog */}
      <AlertDialog open={exportWarningOpen} onOpenChange={setExportWarningOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Một số emails đã được sử dụng</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Các email sau đã được sử dụng:</p>
                <ul className="list-disc pl-5 space-y-2 max-h-40 overflow-y-auto">
                  {alreadyUsedEmails.map((item) => (
                    <li key={item.email} className="text-sm">
                      <span className="font-medium">{item.email}</span>
                      <span className="text-muted-foreground">
                        {' '}- đã sử dụng {item.usageCount} lần bởi: {item.users.map(u => u.name).join(', ')}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted-foreground">
                  Emails chưa sử dụng: {pendingExportEmails.length - alreadyUsedEmails.length} / {pendingExportEmails.length}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleExportOnlyAvailable}
            >
              Chỉ tải emails chưa sử dụng ({pendingExportEmails.length - alreadyUsedEmails.length})
            </Button>
            <AlertDialogAction onClick={handleExportAll}>
              Tải tất cả ({pendingExportEmails.length})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function EmailsPage() {
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
      <EmailsPageContent />
    </Suspense>
  );
}
