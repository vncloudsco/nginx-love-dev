import axios from 'axios';
import { SlaveNode } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface RegisterSlaveNodeRequest {
  name: string;
  host: string;
  port?: number;
  syncInterval?: number;
}

export interface UpdateSlaveNodeRequest {
  name?: string;
  host?: string;
  port?: number;
  syncEnabled?: boolean;
  syncInterval?: number;
}

export interface SyncConfigRequest {
  force?: boolean;
}

export interface SyncLog {
  id: string;
  nodeId: string;
  type: 'full_sync' | 'incremental_sync' | 'health_check';
  status: 'success' | 'failed' | 'partial' | 'running';
  configHash?: string;
  changesCount?: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
}

export interface SlaveNodeWithLogs extends SlaveNode {
  syncLogs?: SyncLog[];
}

class SlaveNodeService {
  private getHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  async getAll(): Promise<SlaveNode[]> {
    const response = await axios.get(`${API_URL}/slave/nodes`, {
      headers: this.getHeaders(),
    });
    return response.data.data;
  }

  async getById(id: string): Promise<SlaveNodeWithLogs> {
    const response = await axios.get(`${API_URL}/slave/nodes/${id}`, {
      headers: this.getHeaders(),
    });
    return response.data.data;
  }

  async register(data: RegisterSlaveNodeRequest) {
    const response = await axios.post(`${API_URL}/slave/nodes`, data, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async update(id: string, data: UpdateSlaveNodeRequest) {
    const response = await axios.put(`${API_URL}/slave/nodes/${id}`, data, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async delete(id: string) {
    const response = await axios.delete(`${API_URL}/slave/nodes/${id}`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async syncToNode(id: string, data: SyncConfigRequest = {}) {
    const response = await axios.post(`${API_URL}/slave/nodes/${id}/sync`, data, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async syncToAll() {
    const response = await axios.post(`${API_URL}/slave/nodes/sync-all`, {}, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async getStatus(id: string) {
    const response = await axios.get(`${API_URL}/slave/nodes/${id}/status`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async getSyncHistory(id: string, limit: number = 50) {
    const response = await axios.get(`${API_URL}/slave/nodes/${id}/sync-history`, {
      headers: this.getHeaders(),
      params: { limit },
    });
    return response.data.data;
  }

  async regenerateApiKey(id: string) {
    const response = await axios.post(`${API_URL}/slave/nodes/${id}/regenerate-key`, {}, {
      headers: this.getHeaders(),
    });
    return response.data;
  }
}

export const slaveNodeService = new SlaveNodeService();
