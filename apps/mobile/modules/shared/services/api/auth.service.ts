import AsyncStorage from '@react-native-async-storage/async-storage';
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
    const response = await apiClient.post<LoginResponse>('/auth/login', data);

    // Store tokens
    if (response.accessToken) {
      await AsyncStorage.setItem(STORAGE_KEY_TOKEN, response.accessToken);
    }
    if (response.refreshToken) {
      await AsyncStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, response.refreshToken);
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
      await AsyncStorage.setItem(STORAGE_KEY_TOKEN, response.accessToken);
    }
    if (response.refreshToken) {
      await AsyncStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, response.refreshToken);
    }

    return response;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');

    // Clear stored tokens
    await AsyncStorage.multiRemove([STORAGE_KEY_TOKEN, STORAGE_KEY_REFRESH_TOKEN]);
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
    return !!token;
  }

  /**
   * Get stored access token
   */
  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEY_TOKEN);
  }

  /**
   * Get stored refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEY_REFRESH_TOKEN);
  }
}

export const authService = new AuthService();
