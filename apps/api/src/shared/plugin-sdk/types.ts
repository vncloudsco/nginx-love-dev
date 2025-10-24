/**
 * Plugin System Types & Interfaces
 * Định nghĩa các types và interfaces chuẩn cho hệ thống plugin
 */

import { Router, Application } from 'express';

/**
 * Plugin Type - Các loại plugin được hỗ trợ
 */
export enum PluginType {
  FEATURE = 'feature',        // Plugin chức năng
  INTEGRATION = 'integration', // Plugin tích hợp bên thứ ba
  UI = 'ui',                  // Plugin giao diện (frontend)
  MIDDLEWARE = 'middleware',   // Plugin middleware
  HOOK = 'hook'               // Plugin hook vào lifecycle
}

/**
 * Plugin Status - Trạng thái của plugin
 */
export enum PluginStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  INSTALLING = 'installing',
  UNINSTALLING = 'uninstalling'
}

/**
 * Plugin Permission - Quyền hạn plugin
 */
export interface PluginPermission {
  resource: string;   // Tài nguyên (vd: 'nginx', 'user', 'config')
  actions: string[];  // Các hành động được phép (vd: ['read', 'write', 'delete'])
}

/**
 * Plugin Metadata - Thông tin mô tả plugin
 */
export interface PluginMetadata {
  id: string;                          // ID duy nhất của plugin
  name: string;                        // Tên plugin
  version: string;                     // Phiên bản (semver)
  description: string;                 // Mô tả ngắn
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  type: PluginType;                    // Loại plugin
  category?: string;                   // Danh mục (vd: 'security', 'monitoring', 'logging')
  tags?: string[];                     // Tags để tìm kiếm
  icon?: string;                       // URL hoặc base64 icon
  homepage?: string;                   // Trang chủ plugin
  repository?: string;                 // Git repository
  license: string;                     // License (vd: 'MIT', 'Apache-2.0')
  dependencies?: Record<string, string>; // NPM dependencies
  peerDependencies?: Record<string, string>;
  minSystemVersion?: string;           // Phiên bản hệ thống tối thiểu
  maxSystemVersion?: string;           // Phiên bản hệ thống tối đa
  permissions?: PluginPermission[];    // Quyền hạn yêu cầu
  configSchema?: Record<string, any>;  // JSON Schema cho config
  screenshots?: string[];              // Screenshots
}

/**
 * Plugin Configuration - Cấu hình của plugin
 */
export interface PluginConfig {
  enabled: boolean;
  settings?: Record<string, any>;
}

/**
 * Plugin Context - Context cung cấp cho plugin để tương tác với hệ thống
 */
export interface PluginContext {
  app: Application;                    // Express app instance
  logger: {
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
  };
  db: any;                             // Prisma client instance
  config: PluginConfig;                // Plugin configuration
  storage: PluginStorage;              // Storage API cho plugin
  events: PluginEventEmitter;          // Event system
  api: PluginAPI;                      // API để tương tác với system
}

/**
 * Plugin Storage - API lưu trữ dữ liệu cho plugin
 */
export interface PluginStorage {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  has: (key: string) => Promise<boolean>;
  keys: () => Promise<string[]>;
}

/**
 * Plugin Event Emitter - Event system cho plugin
 */
export interface PluginEventEmitter {
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
  once: (event: string, handler: (...args: any[]) => void) => void;
}

/**
 * Plugin API - API để plugin tương tác với hệ thống
 */
export interface PluginAPI {
  registerRoute: (path: string, router: Router) => void;
  registerMiddleware: (middleware: any) => void;
  registerHook: (hookName: string, handler: Function) => void;
  callHook: (hookName: string, ...args: any[]) => Promise<any[]>;
  getSystemConfig: () => Promise<Record<string, any>>;
  getPluginConfig: (pluginId: string) => Promise<PluginConfig | null>;
  updatePluginConfig: (pluginId: string, config: PluginConfig) => Promise<void>;
}

/**
 * Plugin Lifecycle Hooks
 */
export interface PluginLifecycle {
  onInstall?: (context: PluginContext) => Promise<void>;
  onUninstall?: (context: PluginContext) => Promise<void>;
  onActivate?: (context: PluginContext) => Promise<void>;
  onDeactivate?: (context: PluginContext) => Promise<void>;
  onUpdate?: (context: PluginContext, oldVersion: string, newVersion: string) => Promise<void>;
  onConfigChange?: (context: PluginContext, oldConfig: PluginConfig, newConfig: PluginConfig) => Promise<void>;
}

/**
 * Plugin Main Interface - Interface chính mà mọi plugin phải implement
 */
export interface IPlugin extends PluginLifecycle {
  metadata: PluginMetadata;
  
  /**
   * Initialize plugin
   * Được gọi khi plugin được load vào hệ thống
   */
  initialize(context: PluginContext): Promise<void>;
  
  /**
   * Destroy plugin
   * Được gọi khi plugin bị unload khỏi hệ thống
   */
  destroy(): Promise<void>;
  
  /**
   * Health check
   * Kiểm tra trạng thái hoạt động của plugin
   */
  healthCheck?(): Promise<{ healthy: boolean; message?: string }>;
}

/**
 * Plugin Package - Cấu trúc package plugin
 */
export interface PluginPackage {
  metadata: PluginMetadata;
  mainFile: string;               // Entry point file (vd: 'dist/index.js')
  files?: string[];               // Danh sách files trong package
  checksum?: string;              // Checksum để verify integrity
  signature?: string;             // Digital signature
}

/**
 * Plugin Registry Entry - Thông tin plugin trong registry
 */
export interface PluginRegistryEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  type: PluginType;
  category?: string;
  tags?: string[];
  icon?: string;
  downloadUrl: string;
  homepage?: string;
  repository?: string;
  license: string;
  downloads: number;
  rating?: number;
  reviews?: number;
  createdAt: Date;
  updatedAt: Date;
  versions: Array<{
    version: string;
    downloadUrl: string;
    changelog?: string;
    publishedAt: Date;
  }>;
}

/**
 * Plugin Installation Options
 */
export interface PluginInstallOptions {
  source: 'npm' | 'url' | 'file' | 'marketplace';
  packageName?: string;           // Tên package trên npm
  url?: string;                   // URL để download
  filePath?: string;              // Đường dẫn file local
  version?: string;               // Phiên bản cụ thể
  force?: boolean;                // Force install
  skipValidation?: boolean;       // Bỏ qua validation
}

/**
 * Plugin Validation Result
 */
export interface PluginValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Plugin Hook Event
 */
export interface PluginHookEvent {
  hookName: string;
  pluginId: string;
  timestamp: Date;
  data?: any;
}
