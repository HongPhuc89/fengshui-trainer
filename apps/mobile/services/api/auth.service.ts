import { apiClient } from './client';
import { storage } from '../../utils/storage';

// Use same storage keys as AuthContext
const STORAGE_KEY_TOKEN = '@quiz_game:auth_token';
const STORAGE_KEY_USER = '@quiz_game:user';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: number;
    email: string;
    full_name: string;
    role: string;
  };
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login_at?: string;
}

class AuthService {
  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);

    // Save token to storage
    if (response.access_token) {
      await storage.setItem(STORAGE_KEY_TOKEN, response.access_token);
      await storage.setItem(STORAGE_KEY_USER, JSON.stringify(response.user));
      console.log('✅ Token saved to:', STORAGE_KEY_TOKEN);
    }

    return response;
  }

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);

    // Save token to storage
    if (response.access_token) {
      await storage.setItem(STORAGE_KEY_TOKEN, response.access_token);
      await storage.setItem(STORAGE_KEY_USER, JSON.stringify(response.user));
    }

    return response;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await storage.removeItem(STORAGE_KEY_TOKEN);
    await storage.removeItem(STORAGE_KEY_USER);
  }

  /**
   * Get current user from storage
   */
  async getCurrentUser(): Promise<User | null> {
    const userStr = await storage.getItem(STORAGE_KEY_USER);
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Check if user is logged in
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await storage.getItem(STORAGE_KEY_TOKEN);
    return !!token;
  }

  /**
   * Get user profile from API
   */
  async getProfile(): Promise<User> {
    return apiClient.get<User>('/auth/profile');
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiClient.patch<User>('/auth/profile', data);
    await storage.setItem(STORAGE_KEY_USER, JSON.stringify(response));
    return response;
  }

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  }
}

export const authService = new AuthService();
