import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: 'admin' | 'moderator' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role?: 'admin' | 'moderator' | 'viewer';
  status?: 'active' | 'inactive';
  phone?: string;
  timezone?: string;
  language?: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  fullName?: string;
  role?: 'admin' | 'moderator' | 'viewer';
  status?: 'active' | 'inactive' | 'suspended';
  phone?: string;
  timezone?: string;
  language?: string;
  avatar?: string;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byRole: {
    admin: number;
    moderator: number;
    viewer: number;
  };
  recentLogins: number;
}

const userService = {
  // Get all users
  async getAll(params?: { role?: string; status?: string; search?: string }): Promise<{ success: boolean; data: User[] }> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    const response = await axios.get(`${API_URL}/users${queryString ? `?${queryString}` : ''}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Get single user
  async getById(id: string): Promise<{ success: boolean; data: User }> {
    const response = await axios.get(`${API_URL}/users/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Create new user
  async create(data: CreateUserData): Promise<{ success: boolean; data: User; message: string }> {
    const response = await axios.post(`${API_URL}/users`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Update user
  async update(id: string, data: UpdateUserData): Promise<{ success: boolean; data: User; message: string }> {
    const response = await axios.put(`${API_URL}/users/${id}`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Delete user
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(`${API_URL}/users/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Toggle user status
  async updateStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<{ success: boolean; data: User; message: string }> {
    const response = await axios.patch(`${API_URL}/users/${id}/status`, { status }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Reset user password
  async resetPassword(id: string): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await axios.post(`${API_URL}/users/${id}/reset-password`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Get user statistics
  async getStats(): Promise<{ success: boolean; data: UserStats }> {
    const response = await axios.get(`${API_URL}/users/stats`, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

export default userService;
