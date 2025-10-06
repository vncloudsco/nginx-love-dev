import axios from 'axios';
import { SystemConfig, ApiResponse } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

export const systemConfigService = {
  /**
   * Get system configuration
   */
  getConfig: async (): Promise<ApiResponse<SystemConfig>> => {
    const response = await axios.get(`${API_URL}/system-config`, {
      headers: getHeaders(),
    });
    return response.data;
  },

  /**
   * Update node mode (master or slave)
   */
  updateNodeMode: async (nodeMode: 'master' | 'slave'): Promise<ApiResponse<SystemConfig>> => {
    const response = await axios.put(
      `${API_URL}/system-config/node-mode`,
      { nodeMode },
      {
        headers: getHeaders(),
      }
    );
    return response.data;
  },

  /**
   * Connect to master node (for slave mode)
   */
  connectToMaster: async (params: {
    masterHost: string;
    masterPort: number;
    masterApiKey: string;
  }): Promise<ApiResponse<SystemConfig>> => {
    const response = await axios.post(
      `${API_URL}/system-config/connect-master`,
      params,
      {
        headers: getHeaders(),
      }
    );
    return response.data;
  },

  /**
   * Disconnect from master node
   */
  disconnectFromMaster: async (): Promise<ApiResponse<SystemConfig>> => {
    const response = await axios.post(
      `${API_URL}/system-config/disconnect-master`,
      {},
      {
        headers: getHeaders(),
      }
    );
    return response.data;
  },

  /**
   * Test connection to master
   */
  testMasterConnection: async (): Promise<ApiResponse<{
    latency: number;
    masterVersion: string;
    masterStatus: string;
  }>> => {
    const response = await axios.post(
      `${API_URL}/system-config/test-master-connection`,
      {},
      {
        headers: getHeaders(),
      }
    );
    return response.data;
  },

  /**
   * Sync configuration from master (slave pulls config)
   */
  syncWithMaster: async (): Promise<ApiResponse<{
    changesApplied: number;
    lastSyncAt: string;
  }>> => {
    const response = await axios.post(
      `${API_URL}/system-config/sync`,
      {},
      {
        headers: getHeaders(),
      }
    );
    return response.data;
  },
};
