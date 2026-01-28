// ==================== ENUMS ====================
export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  DEV = 'DEV',
  CTV = 'CTV',
  CHECKER = 'CHECKER',
}

export enum WebsiteStatus {
  NEW = 'NEW',           // Mới thêm vào hệ thống
  CHECKING = 'CHECKING', // Đang trong quá trình CTV check
  HANDING = 'HANDING',   // Đội CTV test tay
  PENDING = 'PENDING',   // Chờ dev phát triển trên tool
  RUNNING = 'RUNNING',   // Đã sẵn sàng vào hệ thống
  ERROR = 'ERROR',       // Lỗi
  MAINTENANCE = 'MAINTENANCE', // Đang bảo trì
}

export enum WebsiteType {
  ENTITY = 'ENTITY',
  BLOG2 = 'BLOG2',
  PODCAST = 'PODCAST',
  SOCIAL = 'SOCIAL',
  GG_STACKING = 'GG_STACKING',
  ENTITY_SOCIAL = 'ENTITY_SOCIAL',
}

export enum PeriodType {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

// ==================== USER ====================
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserWithoutPassword = Omit<User, 'password'>;

// ==================== WEBSITE METRICS ====================
export interface WebsiteMetrics {
  traffic?: number;
  DA?: number;
  // Captcha info
  captcha_type?: 'captcha' | 'normal';
  captcha_provider?: 'recaptcha' | 'hcaptcha'; // Only when captcha_type = 'captcha'
  cloudflare?: boolean; // Can be true for both captcha and normal types
  // Index
  index?: 'yes' | 'no';
  // About
  about?: 'no_stacking' | 'stacking_post' | 'stacking_about' | 'long_about';
  about_max_chars?: number; // Max characters allowed for about
  // Other fields
  username?: 'unique' | 'duplicate' | 'no'; // Unique: không trùng, Duplicate: được trùng, No: không có username
  email?: 'multi' | 'no_multi';
  required_gmail?: 'yes' | 'no';
  verify?: 'yes' | 'no';
  text_link?: 'no' | 'href' | 'markdown' | 'BBCode';
  social_connect?: ('facebook' | 'twitter' | 'youtube' | 'linkedin')[];
  avatar?: 'yes' | 'no';
  cover?: 'yes' | 'no';
}

// ==================== WEBSITE ====================
export interface Website {
  id: string;
  domain: string;
  types: WebsiteType[];
  status: WebsiteStatus;
  notes?: string | null;
  metrics?: WebsiteMetrics | null;
  createdBy?: string | null;
  checkerId?: string | null;
  priority: number;
  category?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  lastTestedAt?: string | null;
  lastUsedAt?: string | null;
  lastCheckedAt?: string | null;
  creator?: User | null;
  checker?: User | null;
  // Success rate stats
  successRate?: number | null;
  totalAttempts?: number;
}

// ==================== REGISTRATION LOG ====================
export interface RegistrationLog {
  id: string;
  websiteId: string;
  userId?: string | null;
  isSuccess: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  stackTrace?: string | null;
  startTime: string;
  endTime?: string | null;
  duration?: number | null;
  requestData?: Record<string, unknown> | null;
  responseData?: Record<string, unknown> | null;
  toolVersion?: string | null;
  toolName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  website?: Website;
  user?: User | null;
}

// ==================== WEBSITE STATS ====================
export interface WebsiteStats {
  id: string;
  websiteId: string;
  userId?: string | null;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  totalAttempts: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDuration?: number | null;
  minDuration?: number | null;
  maxDuration?: number | null;
  errorTypes?: Record<string, number> | null;
  metrics?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== API RESPONSE ====================
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ==================== PAGINATION ====================
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface SortQuery {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchQuery {
  search?: string;
}

export type QueryParams = PaginationQuery & SortQuery & SearchQuery;

// ==================== AUTH ====================
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: UserWithoutPassword;
  accessToken: string;
  refreshToken?: string;
}

// ==================== WEBSITE FILTERS ====================
export interface WebsiteFilters {
  // Sort options
  sortBy?: 'traffic' | 'DA' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
  // Filter by type
  type?: WebsiteType;
  // Filter by status
  status?: WebsiteStatus;
  // Filter by index
  index?: 'yes' | 'no';
  // Filter by captcha
  captcha_type?: 'captcha' | 'normal';
  captcha_provider?: 'recaptcha' | 'hcaptcha';
  // Filter by required_gmail
  required_gmail?: 'yes' | 'no';
  // Filter by verify
  verify?: 'yes' | 'no';
  // Filter by date range
  startDate?: string; // Format: YYYY-MM-DD
  endDate?: string; // Format: YYYY-MM-DD
}

// ==================== WEBSITE QUERIES ====================
export interface WebsiteQuery extends PaginationQuery, SearchQuery, WebsiteFilters {
  status?: WebsiteStatus;
  category?: string;
  tags?: string[];
}

export interface CreateWebsiteRequest {
  domain: string;
  types?: WebsiteType[];
  status?: WebsiteStatus;
  notes?: string;
  priority?: number;
  category?: string;
  tags?: string[];
  metrics?: WebsiteMetrics;
}

export interface UpdateWebsiteRequest {
  domain?: string;
  types?: WebsiteType[];
  status?: WebsiteStatus;
  notes?: string;
  priority?: number;
  category?: string;
  tags?: string[];
  metrics?: WebsiteMetrics;
}

// ==================== GMAIL ====================
export enum GmailStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export interface GmailUsage {
  id: string;
  gmailId: string;
  userId: string;
  user: {
    id: string;
    name: string;
  };
  usedAt: string;
}

export interface Gmail {
  id: string;
  email: string;
  password: string;
  appPassword?: string | null;
  twoFA?: string | null;
  recoveryEmail?: string | null;
  ownerId?: string | null;
  owner?: User | null;
  status: GmailStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  usages?: GmailUsage[];
}

export interface GmailQuery extends PaginationQuery, SearchQuery {
  status?: GmailStatus;
  ownerId?: string; // Can be UUID or 'none' for null owner
  startDate?: string; // ISO date string (YYYY-MM-DD)
  endDate?: string; // ISO date string (YYYY-MM-DD)
  sortBy?: 'email' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateGmailRequest {
  email: string;
  password: string;
  appPassword?: string;
  twoFA?: string;
  recoveryEmail?: string;
  ownerId?: string;
  status?: GmailStatus;
}

export interface UpdateGmailRequest {
  email?: string;
  password?: string;
  appPassword?: string | null;
  twoFA?: string | null;
  recoveryEmail?: string | null;
  ownerId?: string | null;
  status?: GmailStatus;
}

// ==================== TOOL ====================
export enum ToolType {
  INDIVIDUAL = 'INDIVIDUAL',
  GLOBAL = 'GLOBAL',
  CANCEL = 'CANCEL',
  RE_RUNNING = 'RE_RUNNING',
}

export enum ToolStatus {
  RUNNING = 'RUNNING',
  DIE = 'DIE',
}

export enum ToolService {
  ENTITY = 'ENTITY',
  SOCIAL = 'SOCIAL',
  INDEX = 'INDEX',
  GOOGLE_STACKING = 'GOOGLE_STACKING',
  BLOG = 'BLOG',
  PODCAST = 'PODCAST',
}

export interface Tool {
  id: string;
  userId?: string | null;
  user?: User | null;
  idTool: string;
  threadNumber: number;
  type: ToolType;
  status: ToolStatus;
  service: ToolService;
  estimateTime?: number | null;
  customerType?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ToolQuery extends PaginationQuery, SearchQuery {
  type?: ToolType;
  status?: ToolStatus;
  service?: ToolService;
  userId?: string;
  sortBy?: 'idTool' | 'createdAt' | 'status' | 'type' | 'service';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateToolRequest {
  idTool: string;
  userId?: string;
  threadNumber?: number;
  type?: ToolType;
  status?: ToolStatus;
  service?: ToolService;
  estimateTime?: number;
  customerType?: string;
}

export interface UpdateToolRequest {
  idTool?: string;
  userId?: string | null;
  threadNumber?: number;
  type?: ToolType;
  status?: ToolStatus;
  service?: ToolService;
  estimateTime?: number | null;
  customerType?: string | null;
}

// ==================== PROXY ====================
export enum ProxyType {
  IPV4_STATIC = 'IPV4_STATIC',
  IPV6_STATIC = 'IPV6_STATIC',
  SOCKS5 = 'SOCKS5',
  ROTATING = 'ROTATING',
}

export enum ProxyProtocol {
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
  SOCKS4 = 'SOCKS4',
  SOCKS5 = 'SOCKS5',
}

export enum ProxyStatus {
  ACTIVE = 'ACTIVE',
  DEAD = 'DEAD',
  CHECKING = 'CHECKING',
  UNKNOWN = 'UNKNOWN',
}

export enum ProxyServiceType {
  ENTITY = 'ENTITY',
  BLOG_2_0 = 'BLOG_2_0',
  PODCAST = 'PODCAST',
  SOCIAL = 'SOCIAL',
  GG_STACKING = 'GG_STACKING',
}

export interface Proxy {
  id: string;
  ip: string;
  port: number;
  username?: string | null;
  password?: string | null;
  type: ProxyType;
  protocol: ProxyProtocol;
  services: ProxyServiceType[];
  status: ProxyStatus;
  lastCheckedAt?: string | null;
  responseTime?: number | null;
  failCount: number;
  country?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ProxyQuery extends PaginationQuery, SearchQuery {
  type?: ProxyType;
  protocol?: ProxyProtocol;
  status?: ProxyStatus;
  service?: ProxyServiceType;
  country?: string;
  sortBy?: 'ip' | 'createdAt' | 'status' | 'type' | 'responseTime' | 'lastCheckedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateProxyRequest {
  ip: string;
  port: number;
  username?: string;
  password?: string;
  type?: ProxyType;
  protocol?: ProxyProtocol;
  services?: ProxyServiceType[];
  note?: string;
}

export interface BulkCreateProxyRequest {
  proxies: string; // Raw text with format: IP:PORT:USER:PASS per line
  type?: ProxyType;
  protocol?: ProxyProtocol;
  services?: ProxyServiceType[];
  handleTrashed?: 'restore' | 'replace'; // How to handle proxies in trash
}

export interface UpdateProxyRequest {
  ip?: string;
  port?: number;
  username?: string | null;
  password?: string | null;
  type?: ProxyType;
  protocol?: ProxyProtocol;
  services?: ProxyServiceType[];
  status?: ProxyStatus;
  note?: string | null;
}
