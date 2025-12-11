import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, fontSizes } from '@/constants';

interface ProfileHeaderProps {
  userName: string;
  currentLevelTitle: string;
}

export function ProfileHeader({ userName, currentLevelTitle }: ProfileHeaderProps) {
  return (
    <View style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.avatar}>
          <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
        </LinearGradient>
      </View>
      <Text style={styles.userName}>{userName}</Text>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{currentLevelTitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
