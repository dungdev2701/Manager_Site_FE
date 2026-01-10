/**
 * Shared API Client
 *
 * Re-export api client từ lib/api/client.ts
 * File này serve như một abstraction layer, cho phép:
 * - Thay đổi implementation mà không ảnh hưởng features
 * - Có thể switch sang fetch hoặc library khác trong tương lai
 */

export { apiClient, apiRequest } from '@/lib/api/client';
