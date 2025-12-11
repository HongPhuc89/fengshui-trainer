import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { fontSizes, spacing } from '@/constants';
import { useLeaderboardData } from '../../hooks/useLeaderboardData';
import { LeaderboardEntry } from '../../components/leaderboard';

export default function LeaderboardScreen() {
  const { leaderboard, isLoading, user, getMedalIcon, getRankColor } = useLeaderboardData();

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>BẢNG PHONG THẦN</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Đang tải bảng xếp hạng...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {leaderboard.map((entry: any) => {
              const isCurrentUser = entry.user_id === user?.id;
              return (
                <LeaderboardEntry
                  key={entry.user_id}
                  entry={entry}
                  isCurrentUser={isCurrentUser}
                  getMedalIcon={getMedalIcon}
                  getRankColor={getRankColor}
                />
              );
            })}

            {leaderboard.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Chưa có dữ liệu xếp hạng</Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
  },
  headerTitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: fontSizes.base,
  },
  scrollContent: {
    padding: spacing.md,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: fontSizes.base,
  },
});
