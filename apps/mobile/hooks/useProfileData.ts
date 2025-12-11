import { useAuth } from '../modules/shared/services/contexts/AuthContext';
import { useUserExperience } from '../modules/shared/services/hooks';

export function useProfileData() {
  const { user } = useAuth();
  const { data: userExperience } = useUserExperience();

  // Get user data
  const userName = user?.full_name || user?.email?.split('@')[0] || 'Đạo Hữu';
  const currentLevel = userExperience?.current_level;
  const nextLevel = userExperience?.next_level;
  const totalXP = userExperience?.total_xp || 0;
  const xpProgress = nextLevel
    ? ((totalXP - currentLevel.xp_required) / (nextLevel.xp_required - currentLevel.xp_required)) * 100
    : 100;

  return {
    userName,
    currentLevel,
    nextLevel,
    totalXP,
    xpProgress,
  };
}
