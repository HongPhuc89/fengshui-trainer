import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, fontSizes } from '@/constants';

interface LeaderboardEntryProps {
  entry: any;
  isCurrentUser: boolean;
  getMedalIcon: (rank: number) => string | null;
  getRankColor: (levelColor?: string) => string;
}

export function LeaderboardEntry({ entry, isCurrentUser, getMedalIcon, getRankColor }: LeaderboardEntryProps) {
  const medal = getMedalIcon(entry.rank);

  return (
    <View
      style={[styles.leaderboardItem, isCurrentUser && styles.currentUserItem, entry.rank <= 3 && styles.topThreeItem]}
    >
      {/* Rank */}
      <View style={styles.rankContainer}>
        {medal ? <Text style={styles.medalIcon}>{medal}</Text> : <Text style={styles.rankNumber}>{entry.rank}</Text>}
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
}

const styles = StyleSheet.create({
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
});
