import { useQuery } from '@tanstack/react-query';
import { experienceService } from '../../../../services/api/experience.service';

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  full_name: string;
  email: string;
  experience_points: number;
  level: {
    id: number;
    level: number;
    title: string;
    color?: string;
  };
}

/**
 * Hook to fetch leaderboard (top 10 users by XP)
 */
export const useLeaderboard = () => {
  return useQuery<{ data: LeaderboardEntry[] }>({
    queryKey: ['leaderboard'],
    queryFn: () => experienceService.getLeaderboard(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
};
