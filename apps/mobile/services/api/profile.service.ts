import { apiClient } from './client';

export interface UserProfile {
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  avatar_url: string | null;
}

export interface UserProfileResponse {
  id: number;
  email: string;
  full_name: string;
  role: string;
  experience_points: number;
  profile: UserProfile;
}

export interface UpdateProfileDto {
  full_name?: string;
  date_of_birth?: string; // YYYY-MM-DD
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
}

export interface UploadAvatarResponse {
  avatar_url: string;
  uploaded_file_id: number;
}

export const profileService = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserProfileResponse> {
    const { data } = await apiClient.get<UserProfileResponse>('/profile');
    return data;
  },

  /**
   * Update user profile
   */
  async updateProfile(dto: UpdateProfileDto): Promise<UserProfileResponse> {
    const { data } = await apiClient.patch<UserProfileResponse>('/profile', dto);
    return data;
  },

  /**
   * Upload avatar
   */
  async uploadAvatar(imageUri: string): Promise<UploadAvatarResponse> {
    const formData = new FormData();

    // Extract filename from URI
    const filename = imageUri.split('/').pop() || 'avatar.jpg';

    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: filename,
    } as any);

    const { data } = await apiClient.post<UploadAvatarResponse>('/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  /**
   * Delete avatar
   */
  async deleteAvatar(): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>('/profile/avatar');
    return data;
  },
};
