import React, { useEffect } from 'react';
import { Stack, usePathname, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as amplitude from '@amplitude/analytics-react-native';
import { AuthProvider } from '@/modules/shared/services/contexts/AuthContext';

// Initialize Amplitude
const AMPLITUDE_API_KEY = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY;
if (AMPLITUDE_API_KEY) {
  amplitude.init(AMPLITUDE_API_KEY);
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    const logScreenView = async () => {
      try {
        // Construct a screen name from segments for better readability
        // e.g., (tabs)/books -> books
        const screenName = segments.join('/') || 'index';

        console.log(`📊 [Amplitude] Logging screen view: ${screenName} (${pathname})`);

        amplitude.track('screen_view', {
          screen_name: screenName,
          path: pathname,
        });
      } catch (error) {
        console.error('❌ [Amplitude] Failed to log screen view:', error);
      }
    };

    if (AMPLITUDE_API_KEY) {
      logScreenView();
    }
  }, [pathname, segments]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
