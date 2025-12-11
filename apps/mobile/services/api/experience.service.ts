import { apiClient } from './client';

export interface Level {
  id: number;
  level: number;
  xp_required: number;
  title: string;
  icon?: string;
  color?: string;
  rewards?: any;
}

export interface UserExperienceSummary {
  user_id: number;
  total_xp: number;
  current_level: Level;
  next_level: {
    id: number;
    level: number;
    xp_required: number;
    title: string;
    color?: string;
    xp_remaining: number;
    progress_percentage: number;
  } | null;
}

export interface ExperienceLog {
  id: number;
  source_type: string;
  source_id?: number;
  xp: number;
  description?: string;
  created_at: string;
}

export interface ExperienceLogsResponse {
  data: ExperienceLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  summary: {
    total_xp_earned: number;
    by_source: Record<string, number>;
  };
}

export const experienceService = {
  /**
   * Get user's XP summary with current and next level info
   */
  getUserExperience: async (userId: number): Promise<UserExperienceSummary> => {
    return await apiClient.get<UserExperienceSummary>(`/experience/users/${userId}`);
  },

  /**
   * Get user's XP history logs
   */
  getUserExperienceLogs: async (
    userId: number,
    params?: {
      page?: number;
      limit?: number;
      source_type?: string;
      start_date?: string;
    },
  ): Promise<ExperienceLogsResponse> => {
    return await apiClient.get<ExperienceLogsResponse>(`/experience/users/${userId}/logs`, { params });
  },

  /**
   * Get all cultivation ranks/levels
   */
  getAllLevels: async (): Promise<{ data: Level[] }> => {
    return await apiClient.get<{ data: Level[] }>('/experience/levels');
  },

  /**
   * Get level info by XP amount
   */
  getLevelByXP: async (xp: number) => {
    return await apiClient.get(`/experience/levels/by-xp/${xp}`);
  },

  /**
   * Daily check-in (awards 5 XP once per day)
   */
  dailyCheckIn: async (userId: number) => {
    return await apiClient.get(`/experience/users/${userId}/daily-checkin`);
  },

  /**
   * Get leaderboard - Top 10 users by XP
   */
  getLeaderboard: async () => {
    return await apiClient.get('/experience/leaderboard');
  },
};
