import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '@/constants';
import { useAuth } from '@/modules/shared/services/contexts/AuthContext';
import { useProfileData } from '../../hooks/useProfileData';
import { useProfile } from '../../hooks/useProfile';
import { useAvatarUpload } from '../../hooks/useAvatarUpload';
import { ProfileHeader, XPProgressCard, StatCard } from '../../components/profile';
import { ProfileInfoSection } from '../../components/profile/ProfileInfoSection';

export default function ProfileScreen() {
  const { logout } = useAuth();
  const { userName, currentLevel, nextLevel, totalXP, xpProgress } = useProfileData();
  const { profile, loading, error, refreshProfile } = useProfile();
  const { uploading, showAvatarOptions } = useAvatarUpload(refreshProfile);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      {
        text: 'Hủy',
        style: 'cancel',
      },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Avatar & Name */}
          <ProfileHeader
            userName={profile?.full_name || userName}
            currentLevelTitle={currentLevel?.title || 'PHÀM NHÂN'}
            avatarUrl={profile?.profile?.avatar_url}
            onAvatarPress={uploading ? undefined : showAvatarOptions}
          />

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

          {/* Profile Info */}
          <ProfileInfoSection dateOfBirth={profile?.profile?.date_of_birth} gender={profile?.profile?.gender} />

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ff6b6b" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>

          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="small" color="#FFD700" />
              <Text style={styles.uploadingText}>Đang tải ảnh lên...</Text>
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: spacing.md,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
  },
  uploadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  uploadingText: {
    color: '#fff',
    marginLeft: spacing.sm,
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  logoutText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
  },
});
