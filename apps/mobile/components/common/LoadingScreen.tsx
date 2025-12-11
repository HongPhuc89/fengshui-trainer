import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, fontSizes } from '@/constants';

interface LoadingScreenProps {
  message?: string;
  colors?: string[];
}

export function LoadingScreen({
  message = 'Đang tải...',
  colors = ['#1a1f3a', '#2d1f3a', '#3a1f2d'],
}: LoadingScreenProps) {
  return (
    <LinearGradient colors={colors} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.base,
    color: '#fff',
  },
});
