import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSizes } from '@/constants';

interface ProfileHeaderProps {
  userName: string;
  currentLevelTitle: string;
  avatarUrl?: string | null;
  onAvatarPress?: () => void;
}

export function ProfileHeader({ userName, currentLevelTitle, avatarUrl, onAvatarPress }: ProfileHeaderProps) {
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  return (
    <View style={styles.profileHeader}>
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={onAvatarPress}
        activeOpacity={0.8}
        disabled={!onAvatarPress}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(userName)}</Text>
          </LinearGradient>
        )}
        {onAvatarPress && (
          <View style={styles.cameraOverlay}>
            <Ionicons name="camera" size={20} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
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
    position: 'relative',
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
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
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
