import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSizes, spacing } from '@/constants';
import { useLeaderboard } from '@/modules/shared/services/hooks';
import { useAuth } from '@/modules/shared/services/contexts/AuthContext';

export default function LeaderboardScreen() {
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
              const medal = getMedalIcon(entry.rank);

              return (
                <View
                  key={entry.user_id}
                  style={[
                    styles.leaderboardItem,
                    isCurrentUser && styles.currentUserItem,
                    entry.rank <= 3 && styles.topThreeItem,
                  ]}
                >
                  {/* Rank */}
                  <View style={styles.rankContainer}>
                    {medal ? (
                      <Text style={styles.medalIcon}>{medal}</Text>
                    ) : (
                      <Text style={styles.rankNumber}>{entry.rank}</Text>
                    )}
                  </View>

                  {/* Avatar */}
                  <View style={styles.avatarContainer}>
                    <LinearGradient
                      colors={entry.rank <= 3 ? ['#FFD700', '#FFA500'] : ['#4A5568', '#2D3748']}
                      style={styles.avatar}
                    >
                      <Text style={styles.avatarText}>{entry.full_name.charAt(0).toUpperCase()}</Text>
                    </LinearGradient>
                  </View>

                  {/* User Info */}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {entry.full_name}
                      {isCurrentUser && <Text style={styles.youBadge}> (Bạn)</Text>}
                    </Text>
                    <View
                      style={[
                        styles.rankBadge,
                        {
                          backgroundColor: getRankColor(entry.level.color),
                        },
                      ]}
                    >
                      <Text style={styles.rankBadgeText}>{entry.level.title}</Text>
                    </View>
                  </View>

                  {/* XP */}
                  <View style={styles.xpContainer}>
                    <Text style={styles.xpLabel}>TU VI</Text>
                    <Text style={styles.xpValue}>{entry.experience_points.toLocaleString()}</Text>
                  </View>
                </View>
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

  // Header
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

  // Loading
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

  // Scroll Content
  scrollContent: {
    padding: spacing.md,
  },

  // Leaderboard Item
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topThreeItem: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  currentUserItem: {
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    borderColor: '#FFD700',
    borderWidth: 2,
  },

  // Rank
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  rankNumber: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  medalIcon: {
    fontSize: 28,
  },

  // Avatar
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // User Info
  userInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  userName: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  youBadge: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  rankBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rankBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // XP
  xpContainer: {
    alignItems: 'flex-end',
  },
  xpLabel: {
    fontSize: fontSizes.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 2,
  },
  xpValue: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: '#00FF9F',
  },

  // Empty State
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: fontSizes.base,
  },
});
