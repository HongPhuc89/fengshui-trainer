import { useQuery } from '@tanstack/react-query';
import { experienceService, UserExperienceSummary } from '../../../../services/api/experience.service';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to fetch user's experience/XP summary
 */
export const useUserExperience = () => {
  const { user } = useAuth();

  return useQuery<UserExperienceSummary>({
    queryKey: ['user-experience', user?.id],
    queryFn: () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return experienceService.getUserExperience(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to fetch user's XP logs/history
 */
export const useUserExperienceLogs = (params?: {
  page?: number;
  limit?: number;
  source_type?: string;
  start_date?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-experience-logs', user?.id, params],
    queryFn: () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return experienceService.getUserExperienceLogs(user.id, params);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Hook to fetch all cultivation ranks/levels
 */
export const useLevels = () => {
  return useQuery({
    queryKey: ['levels'],
    queryFn: () => experienceService.getAllLevels(),
    staleTime: 1000 * 60 * 60, // 1 hour (levels rarely change)
  });
};
