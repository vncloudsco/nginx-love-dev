import api from './api';
import {  Domain, Upstream, LoadBalancerConfig } from '@/types';

export interface CreateDomainRequest {
  name: string;
  modsecEnabled?: boolean;
  upstreams: {
    host: string;
    port: number;
    weight?: number;
    maxFails?: number;
    failTimeout?: number;
  }[];
  loadBalancer?: {
    algorithm?: 'round_robin' | 'least_conn' | 'ip_hash';
    healthCheckEnabled?: boolean;
    healthCheckInterval?: number;
    healthCheckTimeout?: number;
    healthCheckPath?: string;
  };
}

export interface UpdateDomainRequest {
  name?: string;
  status?: 'active' | 'inactive' | 'error';
  modsecEnabled?: boolean;
  upstreams?: {
    host: string;
    port: number;
    weight?: number;
    maxFails?: number;
    failTimeout?: number;
  }[];
  loadBalancer?: {
    algorithm?: 'round_robin' | 'least_conn' | 'ip_hash';
    healthCheckEnabled?: boolean;
    healthCheckInterval?: number;
    healthCheckTimeout?: number;
    healthCheckPath?: string;
  };
}

/**
 * Get all domains
 */
export const getDomains = async (): Promise<Domain[]> => {
  const response = await api.get('/domains');
  return response.data.data;
};

/**
 * Get domain by ID
 */
export const getDomainById = async (id: string): Promise<Domain> => {
  const response = await api.get(`/domains/${id}`);
  return response.data.data;
};

/**
 * Create new domain
 */
export const createDomain = async (data: CreateDomainRequest): Promise<Domain> => {
  const response = await api.post('/domains', data);
  return response.data.data;
};

/**
 * Update domain
 */
export const updateDomain = async (id: string, data: UpdateDomainRequest): Promise<Domain> => {
  const response = await api.put(`/domains/${id}`, data);
  return response.data.data;
};

/**
 * Delete domain
 */
export const deleteDomain = async (id: string): Promise<void> => {
  await api.delete(`/domains/${id}`);
};

/**
 * Toggle SSL for domain
 */
export const toggleSSL = async (id: string, sslEnabled: boolean): Promise<Domain> => {
  const response = await api.post(`/domains/${id}/toggle-ssl`, { sslEnabled });
  return response.data.data;
};

/**
 * Reload nginx configuration
 */
export const reloadNginx = async (): Promise<void> => {
  await api.post('/domains/nginx/reload');
};

/**
 * Get installation status
 */
export const getInstallationStatus = async (): Promise<any> => {
  const response = await fetch('/api/system/installation-status', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get installation status');
  }

  const result = await response.json();
  return result.data;
};

// Export as object for easier import
export const domainService = {
  getAll: getDomains,
  getById: getDomainById,
  create: createDomain,
  update: updateDomain,
  delete: deleteDomain,
  toggleSSL,
  reloadNginx,
  getInstallationStatus,
};
