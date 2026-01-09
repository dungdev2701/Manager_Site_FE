import { WebsiteStatus, WebsiteType } from '@/types';

// ==================== WEBSITE STATUS ====================
export const STATUS_COLORS: Record<WebsiteStatus, string> = {
  [WebsiteStatus.NEW]: '#3b82f6',
  [WebsiteStatus.CHECKING]: '#eab308',
  [WebsiteStatus.HANDING]: '#f97316',
  [WebsiteStatus.PENDING]: '#a855f7',
  [WebsiteStatus.RUNNING]: '#22c55e',
  [WebsiteStatus.ERROR]: '#ef4444',
  [WebsiteStatus.MAINTENANCE]: '#6b7280',
};

export const STATUS_LABELS: Record<WebsiteStatus, string> = {
  [WebsiteStatus.NEW]: 'Mới',
  [WebsiteStatus.CHECKING]: 'Đang kiểm tra',
  [WebsiteStatus.HANDING]: 'Test tay',
  [WebsiteStatus.PENDING]: 'Chờ phát triển',
  [WebsiteStatus.RUNNING]: 'Đang chạy',
  [WebsiteStatus.ERROR]: 'Lỗi',
  [WebsiteStatus.MAINTENANCE]: 'Bảo trì',
};

// Tailwind CSS classes for status badges
export const STATUS_BADGE_CLASSES: Record<WebsiteStatus, string> = {
  [WebsiteStatus.NEW]: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  [WebsiteStatus.CHECKING]: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  [WebsiteStatus.HANDING]: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  [WebsiteStatus.PENDING]: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  [WebsiteStatus.RUNNING]: 'bg-green-100 text-green-800 hover:bg-green-200',
  [WebsiteStatus.ERROR]: 'bg-red-100 text-red-800 hover:bg-red-200',
  [WebsiteStatus.MAINTENANCE]: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
};

// ==================== WEBSITE TYPE ====================
export const TYPE_COLORS: Record<WebsiteType, string> = {
  [WebsiteType.ENTITY]: '#3b82f6',
  [WebsiteType.BLOG2]: '#a855f7',
  [WebsiteType.PODCAST]: '#ec4899',
  [WebsiteType.SOCIAL]: '#06b6d4',
  [WebsiteType.GG_STACKING]: '#f59e0b',
};

export const TYPE_LABELS: Record<WebsiteType, string> = {
  [WebsiteType.ENTITY]: 'Entity',
  [WebsiteType.BLOG2]: 'Blog 2.0',
  [WebsiteType.PODCAST]: 'Podcast',
  [WebsiteType.SOCIAL]: 'Social',
  [WebsiteType.GG_STACKING]: 'GG Stacking',
};

// Tailwind CSS classes for type badges
export const TYPE_BADGE_CLASSES: Record<WebsiteType, string> = {
  [WebsiteType.ENTITY]: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  [WebsiteType.BLOG2]: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  [WebsiteType.PODCAST]: 'bg-pink-100 text-pink-800 hover:bg-pink-200',
  [WebsiteType.SOCIAL]: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200',
  [WebsiteType.GG_STACKING]: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
};

// ==================== PERIOD OPTIONS ====================
export const PERIOD_OPTIONS = [
  { value: '7', label: '7 ngày' },
  { value: '14', label: '14 ngày' },
  { value: '30', label: '30 ngày' },
  { value: '60', label: '60 ngày' },
  { value: '90', label: '90 ngày' },
] as const;

// ==================== HELPER FUNCTIONS ====================
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status as WebsiteStatus] || '#6b7280';
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status as WebsiteStatus] || status;
}

export function getStatusBadgeClass(status: string): string {
  return STATUS_BADGE_CLASSES[status as WebsiteStatus] || 'bg-gray-100 text-gray-800';
}

export function getTypeColor(type: string): string {
  return TYPE_COLORS[type as WebsiteType] || '#6b7280';
}

export function getTypeLabel(type: string): string {
  return TYPE_LABELS[type as WebsiteType] || type;
}

export function getTypeBadgeClass(type: string): string {
  return TYPE_BADGE_CLASSES[type as WebsiteType] || 'bg-gray-100 text-gray-800';
}
