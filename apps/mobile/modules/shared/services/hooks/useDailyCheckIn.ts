import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { experienceService } from '../../../../services/api/experience.service';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to automatically perform daily check-in when app opens
 */
export const useDailyCheckIn = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const checkInMutation = useMutation({
    mutationFn: () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return experienceService.dailyCheckIn(user.id);
    },
    onSuccess: (data: any) => {
      if (data.success) {
        // Invalidate user experience query to refresh XP
        queryClient.invalidateQueries({ queryKey: ['user-experience', user?.id] });

        // You can show a toast notification here
        console.log('✅ Daily check-in successful! +5 XP');
      } else {
        console.log('ℹ️ Already checked in today');
      }
    },
    onError: (error) => {
      console.error('❌ Daily check-in failed:', error);
    },
  });

  // Auto check-in when component mounts (app opens)
  useEffect(() => {
    if (user?.id) {
      checkInMutation.mutate();
    }
  }, [user?.id]);

  return {
    checkIn: () => checkInMutation.mutate(),
    isChecking: checkInMutation.isPending,
    checkInData: checkInMutation.data,
  };
};
