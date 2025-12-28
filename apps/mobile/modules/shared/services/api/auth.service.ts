import { storage } from '../../../../utils/storage';
import { apiClient } from './client';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserResponse,
} from './types';

const STORAGE_KEY_TOKEN = '@quiz_game:auth_token';
const STORAGE_KEY_REFRESH_TOKEN = '@quiz_game:refresh_token';

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', data);
    return response;
  }

  /**
   * Login with email and password
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    console.log('🔐 authService.login called');
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    console.log('📦 Login response:', response);

    // Handle both camelCase and snake_case
    const accessToken = (response as any).accessToken || (response as any).access_token;
    const refreshToken = (response as any).refreshToken || (response as any).refresh_token;

    console.log('🔑 Access token:', accessToken ? 'EXISTS' : 'MISSING');
    console.log('🔄 Refresh token:', refreshToken ? 'EXISTS' : 'MISSING');

    // Store tokens
    if (accessToken) {
      console.log('💾 Saving access token...');
      await storage.setItem(STORAGE_KEY_TOKEN, accessToken);
      console.log('✅ Access token saved');
    } else {
      console.error('❌ No access token in response!');
    }

    if (refreshToken) {
      await storage.setItem(STORAGE_KEY_REFRESH_TOKEN, refreshToken);
    }

    return response;
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserResponse> {
    return apiClient.get<UserResponse>('/auth/me');
  }

  /**
   * Refresh access token
   */
  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh-token', data);

    // Update stored tokens
    if (response.accessToken) {
      await storage.setItem(STORAGE_KEY_TOKEN, response.accessToken);
    }
    if (response.refreshToken) {
      await storage.setItem(STORAGE_KEY_REFRESH_TOKEN, response.refreshToken);
    }

    return response;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');

    // Clear stored tokens
    await storage.multiRemove([STORAGE_KEY_TOKEN, STORAGE_KEY_REFRESH_TOKEN]);
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await storage.getItem(STORAGE_KEY_TOKEN);
    return !!token;
  }

  /**
   * Get stored access token
   */
  async getAccessToken(): Promise<string | null> {
    return storage.getItem(STORAGE_KEY_TOKEN);
  }

  /**
   * Get stored refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    return storage.getItem(STORAGE_KEY_REFRESH_TOKEN);
  }
}

export const authService = new AuthService();
