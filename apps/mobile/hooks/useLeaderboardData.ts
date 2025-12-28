import { useLeaderboard } from '../modules/shared/services/hooks';
import { useAuth } from '../modules/shared/services/contexts/AuthContext';

export function useLeaderboardData() {
  const { data, isLoading } = useLeaderboard();
  const { user } = useAuth();

  const leaderboard = data?.data || [];

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const getRankColor = (levelColor?: string) => {
    return levelColor || '#808080';
  };

  return {
    leaderboard,
    isLoading,
    user,
    getMedalIcon,
    getRankColor,
  };
}
