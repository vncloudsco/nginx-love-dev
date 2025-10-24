/**
 * Plugin Types for Frontend
 */

export enum PluginType {
  FEATURE = 'feature',
  INTEGRATION = 'integration',
  UI = 'ui',
  MIDDLEWARE = 'middleware',
  HOOK = 'hook'
}

export enum PluginStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  INSTALLING = 'installing',
  UNINSTALLING = 'uninstalling'
}

export interface PluginAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface PluginPermission {
  resource: string;
  actions: string[];
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: PluginAuthor;
  type: PluginType;
  category?: string;
  tags?: string[];
  icon?: string;
  homepage?: string;
  repository?: string;
  license: string;
  minSystemVersion?: string;
  maxSystemVersion?: string;
  permissions?: PluginPermission[];
  configSchema?: Record<string, any>;
  screenshots?: string[];
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  type: PluginType;
  metadata: PluginMetadata;
  status: PluginStatus;
  enabled: boolean;
  config: Record<string, any> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PluginHealth {
  healthy: boolean;
  message?: string;
}

export interface PluginInstallOptions {
  source: 'npm' | 'url' | 'file' | 'marketplace';
  packageName?: string;
  url?: string;
  filePath?: string;
  version?: string;
  force?: boolean;
  skipValidation?: boolean;
}

export interface PluginListResponse {
  success: boolean;
  data: Plugin[];
}

export interface PluginDetailResponse {
  success: boolean;
  data: Plugin;
}

export interface PluginHealthResponse {
  success: boolean;
  data: PluginHealth;
}

export interface PluginActionResponse {
  success: boolean;
  message: string;
}
