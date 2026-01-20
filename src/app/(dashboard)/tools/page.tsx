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
import { toolApi } from '@/lib/api';
import { Tool, ToolType, ToolStatus, ToolService, ToolQuery } from '@/types';
import { useDebounce } from '@/hooks';
import { AddToolDialog } from '@/components/tools/add-tool-dialog';
import { EditToolDialog } from '@/components/tools/edit-tool-dialog';

const TYPE_BADGE_CLASSES: Record<ToolType, string> = {
  INDIVIDUAL: 'bg-blue-100 text-blue-800 border-blue-200',
  GLOBAL: 'bg-purple-100 text-purple-800 border-purple-200',
  CANCEL: 'bg-gray-100 text-gray-800 border-gray-200',
  RE_RUNNING: 'bg-orange-100 text-orange-800 border-orange-200',
};

const TYPE_LABELS: Record<ToolType, string> = {
  INDIVIDUAL: 'Individual',
  GLOBAL: 'Global',
  CANCEL: 'Cancel',
  RE_RUNNING: 'Re-running',
};

const STATUS_BADGE_CLASSES: Record<ToolStatus, string> = {
  RUNNING: 'bg-green-100 text-green-800 border-green-200',
  DIE: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_LABELS: Record<ToolStatus, string> = {
  RUNNING: 'Running',
  DIE: 'Die',
};

const SERVICE_BADGE_CLASSES: Record<ToolService, string> = {
  ENTITY: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  SOCIAL: 'bg-pink-100 text-pink-800 border-pink-200',
  INDEX: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  GOOGLE_STACKING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  BLOG: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PODCAST: 'bg-violet-100 text-violet-800 border-violet-200',
};

const SERVICE_LABELS: Record<ToolService, string> = {
  ENTITY: 'Entity',
  SOCIAL: 'Social',
  INDEX: 'Index',
  GOOGLE_STACKING: 'GG Stacking',
  BLOG: 'Blog',
  PODCAST: 'Podcast',
};

function ToolsPageContent() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ToolStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<ToolType | 'ALL'>('ALL');
  const [serviceFilter, setServiceFilter] = useState<ToolService | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'idTool' | 'createdAt' | 'status' | 'type' | 'service'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const query: ToolQuery = {
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
    queryKey: ['tools', query],
    queryFn: () => toolApi.getAll(query),
  });

  const deleteMutation = useMutation({
    mutationFn: toolApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      toast.success('Tool deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedTool(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete tool');
    },
  });

  const handleEdit = (tool: Tool) => {
    setSelectedTool(tool);
    setEditDialogOpen(true);
  };

  const handleDelete = (tool: Tool) => {
    setSelectedTool(tool);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedTool) {
      deleteMutation.mutate(selectedTool.id);
    }
  };

  const totalPages = data?.meta.totalPages || 1;
  const total = data?.meta.total || 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
          <p className="text-muted-foreground">Manage automation tools</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tool
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as ToolStatus | 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value={ToolStatus.RUNNING}>Running</SelectItem>
            <SelectItem value={ToolStatus.DIE}>Die</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(value) => {
            setTypeFilter(value as ToolType | 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value={ToolType.INDIVIDUAL}>Individual</SelectItem>
            <SelectItem value={ToolType.GLOBAL}>Global</SelectItem>
            <SelectItem value={ToolType.CANCEL}>Cancel</SelectItem>
            <SelectItem value={ToolType.RE_RUNNING}>Re-running</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={serviceFilter}
          onValueChange={(value) => {
            setServiceFilter(value as ToolService | 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Services</SelectItem>
            <SelectItem value={ToolService.ENTITY}>Entity</SelectItem>
            <SelectItem value={ToolService.SOCIAL}>Social</SelectItem>
            <SelectItem value={ToolService.INDEX}>Index</SelectItem>
            <SelectItem value={ToolService.GOOGLE_STACKING}>GG Stacking</SelectItem>
            <SelectItem value={ToolService.BLOG}>Blog</SelectItem>
            <SelectItem value={ToolService.PODCAST}>Podcast</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['tools'] })}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="rounded-md border overflow-auto max-h-[calc(100vh-320px)] scrollbar-thin bg-background">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <TableRow>
              <TableHead className="w-[120px]">
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => {
                    if (sortBy === 'idTool') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('idTool');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Tool ID
                  {sortBy === 'idTool' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </button>
              </TableHead>
              <TableHead className="w-[80px] text-center">Threads</TableHead>
              <TableHead className="w-[110px] text-center">
                <button
                  className="flex items-center gap-1 hover:text-foreground"
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
              <TableHead className="w-[90px] text-center">
                <button
                  className="flex items-center gap-1 hover:text-foreground"
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
              <TableHead className="w-[110px] text-center">
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => {
                    if (sortBy === 'service') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('service');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Service
                  {sortBy === 'service' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </button>
              </TableHead>
              <TableHead className="w-[100px] text-center">Est. Time</TableHead>
              <TableHead className="w-[100px] text-center">Customer</TableHead>
              <TableHead className="w-[100px] text-center">User</TableHead>
              <TableHead className="w-[120px] text-center">
                <button
                  className="flex items-center gap-1 hover:text-foreground"
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
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.tools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No tools found
                </TableCell>
              </TableRow>
            ) : (
              data?.tools.map((tool) => (
                <TableRow key={tool.id}>
                  <TableCell>
                    <span className="font-medium font-mono">{tool.idTool}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{tool.threadNumber}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className={TYPE_BADGE_CLASSES[tool.type]}>
                      {TYPE_LABELS[tool.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className={STATUS_BADGE_CLASSES[tool.status]}>
                      {STATUS_LABELS[tool.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className={SERVICE_BADGE_CLASSES[tool.service]}>
                      {SERVICE_LABELS[tool.service]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {tool.estimateTime ? (
                      `${tool.estimateTime} min`
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {tool.customerType || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {tool.user?.name || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {new Date(tool.createdAt).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(tool)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(tool)}
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
          <span>of {total} tools</span>
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
      <AddToolDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <EditToolDialog
        tool={selectedTool}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the tool <strong>{selectedTool?.idTool}</strong>. This action cannot
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
    </div>
  );
}

export default function ToolsPage() {
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
      <ToolsPageContent />
    </Suspense>
  );
}
