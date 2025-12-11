import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSizes, spacing } from '@/constants';
import { useAuth } from '@/modules/shared/services/contexts/AuthContext';
import { useUserExperience } from '@/modules/shared/services/hooks';

export default function ProfileScreen() {
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

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Avatar & Name */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.avatar}>
                <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            </View>
            <Text style={styles.userName}>{userName}</Text>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{currentLevel?.title || 'PHÀM NHÂN'}</Text>
            </View>
          </View>

          {/* XP Progress */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>{nextLevel ? `Tiến độ cấp ${nextLevel.level}` : 'Cấp tối đa'}</Text>
              <Text style={styles.progressPercentage}>{Math.round(xpProgress)}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${xpProgress}%` }]} />
            </View>
            <View style={styles.progressFooter}>
              <Text style={styles.progressXP}>{totalXP} XP</Text>
              <Text style={styles.progressXP}>{nextLevel?.xp_required || totalXP} XP</Text>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            {/* Thiên Thư (Books Read) */}
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <LinearGradient colors={['#4169E1', '#1E90FF']} style={styles.statIcon}>
                  <Text style={styles.statIconText}>📚</Text>
                </LinearGradient>
              </View>
              <Text style={styles.statLabel}>THIÊN THƯ</Text>
              <Text style={styles.statValue}>2</Text>
            </View>

            {/* Ngân Lượng (Currency) */}
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.statIcon}>
                  <Text style={styles.statIconText}>💰</Text>
                </LinearGradient>
              </View>
              <Text style={styles.statLabel}>NGÂN LƯỢNG</Text>
              <Text style={styles.statValue}>50</Text>
            </View>
          </View>
        </ScrollView>
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
  scrollContent: {
    padding: spacing.lg,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  userName: {
    fontSize: fontSizes['2xl'],
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: spacing.sm,
  },
  rankBadge: {
    backgroundColor: '#C41E3A',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  rankText: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // Progress Card
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressTitle: {
    fontSize: fontSizes.base,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  progressPercentage: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 6,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressXP: {
    fontSize: fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIconContainer: {
    marginBottom: spacing.md,
  },
  statIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconText: {
    fontSize: 28,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: spacing.xs,
    letterSpacing: 1,
  },
  statValue: {
    fontSize: fontSizes['2xl'],
    fontWeight: 'bold',
    color: '#FFD700',
  },
});
