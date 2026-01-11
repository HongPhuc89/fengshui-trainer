import React, { useEffect } from 'react';
import { Stack, usePathname, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import analytics from '@react-native-firebase/analytics';
import { AuthProvider } from '@/modules/shared/services/contexts/AuthContext';

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

        console.log(`📊 [Analytics] Logging screen view: ${screenName} (${pathname})`);

        await analytics().logScreenView({
          screen_name: screenName,
          screen_class: screenName,
        });
      } catch (error) {
        console.error('❌ [Analytics] Failed to log screen view:', error);
      }
    };

    logScreenView();
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
