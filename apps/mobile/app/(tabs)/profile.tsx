import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '@/constants';
import { useProfileData } from '../../hooks/useProfileData';
import { ProfileHeader, XPProgressCard, StatCard } from '../../components/profile';

export default function ProfileScreen() {
  const { userName, currentLevel, nextLevel, totalXP, xpProgress } = useProfileData();

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Avatar & Name */}
          <ProfileHeader userName={userName} currentLevelTitle={currentLevel?.title || 'PHÀM NHÂN'} />

          {/* XP Progress */}
          <XPProgressCard
            nextLevelNumber={nextLevel?.level}
            xpProgress={xpProgress}
            totalXP={totalXP}
            nextLevelXP={nextLevel?.xp_required}
          />

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            {/* Thiên Thư (Books Read) */}
            <StatCard icon="📚" label="THIÊN THƯ" value={2} gradient={['#4169E1', '#1E90FF']} />

            {/* Ngân Lượng (Currency) */}
            <StatCard icon="💰" label="NGÂN LƯỢNG" value={50} gradient={['#FFD700', '#FFA500']} />
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
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
